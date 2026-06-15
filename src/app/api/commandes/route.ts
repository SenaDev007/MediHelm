import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/commandes — Liste des commandes fournisseur
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const statut = searchParams.get('statut')
    const fournisseurId = searchParams.get('fournisseurId')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (statut) where.statut = statut
    if (fournisseurId) where.fournisseurId = fournisseurId

    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      where.createdAt = dateFilter
    }

    if (search) {
      where.OR = [
        { nomFournisseur: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      db.commandeFournisseur.findMany({
        where,
        include: {
          fournisseur: { select: { id: true, nom: true, contact: true } },
          lignes: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.commandeFournisseur.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET commandes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    )
  }
}

// POST /api/commandes — Créer une nouvelle commande fournisseur
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    if (!body.nomFournisseur) {
      return NextResponse.json(
        { error: 'Le nom du fournisseur est requis' },
        { status: 400 }
      )
    }

    // Générer la référence CMD-YYYYMMDD-NNNN
    const today = new Date()
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0')

    const commandesToday = await db.commandeFournisseur.count({
      where: {
        pharmacieId: user.pharmacieId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    })

    const reference = `CMD-${dateStr}-${String(commandesToday + 1).padStart(4, '0')}`

    // Calculer le montant total des lignes
    const lignes = body.lignes || []
    const montantTotal = lignes.reduce((sum: number, l: { montant?: number; quantite?: number; prixAchat?: number }) => {
      return sum + (l.montant || (l.quantite || 0) * (l.prixAchat || 0))
    }, 0)

    const data = await db.commandeFournisseur.create({
      data: {
        pharmacieId: user.pharmacieId,
        fournisseurId: body.fournisseurId || null,
        nomFournisseur: body.nomFournisseur,
        statut: body.statut || 'BROUILLON',
        montantTotal: body.montantTotal || montantTotal,
        dateLivraisonPrevue: body.dateLivraisonPrevue ? new Date(body.dateLivraisonPrevue) : null,
        notes: body.notes || null,
        lignes: lignes.length > 0
          ? {
              create: lignes.map((l: { dci: string; nomCommercial?: string; medicamentId?: string; quantite: number; prixAchat: number; montant: number }) => ({
                dci: l.dci,
                nomCommercial: l.nomCommercial || null,
                medicamentId: l.medicamentId || null,
                quantite: l.quantite,
                prixAchat: l.prixAchat,
                montant: l.montant,
              })),
            }
          : undefined,
      },
      include: { lignes: true, fournisseur: true },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'CommandeFournisseur',
        entityId: data.id,
        details: `Commande ${reference} créée pour ${body.nomFournisseur}`,
      },
    })

    return NextResponse.json({ ...data, reference }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST commandes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
      { status: 500 }
    )
  }
}
