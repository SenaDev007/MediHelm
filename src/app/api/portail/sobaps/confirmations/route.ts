import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: SOBAPS_VIEWER or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M03_COMMANDES', 'read')
  if (auth instanceof Response) return auth
  if (!['SOBAPS_VIEWER', 'PLATFORM_ADMIN'].includes(auth.roleName)) {
    return NextResponse.json({ error: 'Accès réservé au portail SoBAPS.' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const statut = searchParams.get('statut')
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20))
    const skip = (page - 1) * limit

    // Get OrdonnanceGrossiste with receptions as confirmations
    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (statut) where.statut = statut

    const [commandes, total] = await Promise.all([
      db.ordonnanceGrossiste.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          pharmacieId: true,
          reference: true,
          statut: true,
          dateLivraison: true,
          createdAt: true,
          updatedAt: true,
          pharmacie: {
            select: { id: true, nom: true, ville: true },
          },
          lignes: {
            select: { id: true, dci: true, nomCommercial: true, quantite: true, quantiteLivre: true },
          },
          reception: {
            select: { id: true, dateReception: true, statut: true },
          },
        },
      }),
      db.ordonnanceGrossiste.count({ where }),
    ])

    // KPIs from ReceptionGrossiste
    const totalConfirmations = await db.receptionGrossiste.count()
    const confirmationsCeMois = await db.receptionGrossiste.count({
      where: {
        dateReception: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    })
    const livraisonsCompletes = await db.receptionGrossiste.count({
      where: { statut: 'COMPLETE' },
    })
    const livraisonsPartielles = await db.receptionGrossiste.count({
      where: { statut: 'PARTIELLE' },
    })

    return NextResponse.json({
      kpis: {
        totalConfirmations,
        confirmationsCeMois,
        livraisonsCompletes,
        livraisonsPartielles,
        tauxCompletude: totalConfirmations > 0
          ? Math.round((livraisonsCompletes / totalConfirmations) * 100)
          : 0,
      },
      commandes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur confirmations SoBAPS:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des confirmations' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Mutations are restricted to platform administrators; SoBAPS is read-only.
  const auth = await requireAuth(request, 'M03_COMMANDES', 'write')
  if (auth instanceof Response) return auth
  if (auth.roleName !== 'PLATFORM_ADMIN') {
    return NextResponse.json({ error: 'La confirmation manuelle est réservée à l’administration plateforme.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { ordonnanceGrossisteId, pharmacieId, statut, notes } = body

    if (!ordonnanceGrossisteId || !pharmacieId) {
      return NextResponse.json(
        { error: 'ordonnanceGrossisteId et pharmacieId sont requis' },
        { status: 400 }
      )
    }

    const ordonnance = await db.ordonnanceGrossiste.findUnique({
      where: { id: ordonnanceGrossisteId },
      select: { pharmacieId: true },
    })
    if (!ordonnance) {
      return NextResponse.json({ error: 'Commande grossiste introuvable' }, { status: 404 })
    }
    if (ordonnance.pharmacieId !== pharmacieId) {
      return NextResponse.json({ error: 'La pharmacie ne correspond pas à la commande' }, { status: 400 })
    }

    // Check if reception already exists
    const existing = await db.receptionGrossiste.findUnique({
      where: { ordonnanceGrossisteId },
    })

    if (existing) {
      if (existing.pharmacieId !== ordonnance.pharmacieId) {
        return NextResponse.json({ error: 'La confirmation existante ne correspond pas à la commande' }, { status: 409 })
      }
      // Update existing reception
      const updated = await db.receptionGrossiste.update({
        where: { id: existing.id },
        data: {
          statut: statut || existing.statut,
          notes: notes || existing.notes,
          dateReception: new Date(),
        },
      })
      return NextResponse.json(updated)
    }

    // Create new reception
    const reception = await db.receptionGrossiste.create({
      data: {
        ordonnanceGrossisteId,
        pharmacieId,
        statut: statut || 'PARTIELLE',
        notes: notes || null,
        dateReception: new Date(),
      },
    })

    return NextResponse.json(reception, { status: 201 })
  } catch (error) {
    console.error('Erreur création confirmation SoBAPS:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la confirmation' },
      { status: 500 }
    )
  }
}
