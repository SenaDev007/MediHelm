import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M11_RETOURS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = {
      pharmacieId,
      type: 'RETOUR',
    }

    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    if (search) {
      where.OR = [
        { motif: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { medicament: { nomCommercial: { contains: search, mode: 'insensitive' } } },
        { medicament: { dci: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * limit

    const [retours, total] = await Promise.all([
      db.mouvementStock.findMany({
        where,
        include: {
          medicament: { select: { id: true, nomCommercial: true, dci: true } },
          lot: { select: { id: true, numeroLot: true, dateExpiration: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.mouvementStock.count({ where }),
    ])

    return NextResponse.json({
      data: retours,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET retours:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des retours' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M11_RETOURS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { medicamentId, lotId, quantite, motif, prixUnitaire, reference } = body

    if (!medicamentId || !quantite) {
      return NextResponse.json(
        { error: 'Les champs medicamentId et quantite sont requis' },
        { status: 400 }
      )
    }

    if (quantite <= 0) {
      return NextResponse.json(
        { error: 'La quantité doit être supérieure à 0' },
        { status: 400 }
      )
    }

    // Vérifier que le médicament appartient à la pharmacie
    const medicament = await db.medicament.findFirst({
      where: { id: medicamentId, pharmacieId },
    })

    if (!medicament) {
      return NextResponse.json(
        { error: 'Médicament introuvable dans cette pharmacie' },
        { status: 404 }
      )
    }

    const retour = await db.mouvementStock.create({
      data: {
        pharmacieId,
        medicamentId,
        lotId: lotId || null,
        type: 'RETOUR',
        quantite: parseInt(String(quantite), 10),
        prixUnitaire: prixUnitaire ? parseFloat(String(prixUnitaire)) : null,
        motif: motif || null,
        reference: reference || null,
        utilisateurId: user.id,
      },
      include: {
        medicament: { select: { id: true, nomCommercial: true, dci: true } },
        lot: { select: { id: true, numeroLot: true, dateExpiration: true } },
      },
    })

    // Remettre le stock du lot si applicable
    if (lotId) {
      await db.lot.update({
        where: { id: lotId },
        data: { quantite: { increment: parseInt(String(quantite), 10) } },
      })
    }

    return NextResponse.json(retour, { status: 201 })
  } catch (error) {
    console.error('Erreur POST retours:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement du retour' },
      { status: 500 }
    )
  }
}
