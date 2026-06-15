import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'read')
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
      type: 'TRANSFERT',
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

    const [transferts, total] = await Promise.all([
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
      data: transferts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET transferts:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des transferts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'write')
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

    // Vérifier le stock disponible si un lot est spécifié
    if (lotId) {
      const lot = await db.lot.findFirst({
        where: { id: lotId, medicamentId, pharmacieId },
      })

      if (!lot) {
        return NextResponse.json(
          { error: 'Lot introuvable pour ce médicament dans cette pharmacie' },
          { status: 404 }
        )
      }

      if (lot.quantite < quantite) {
        return NextResponse.json(
          { error: `Stock insuffisant. Disponible: ${lot.quantite}, Demandé: ${quantite}` },
          { status: 400 }
        )
      }
    }

    const transfert = await db.mouvementStock.create({
      data: {
        pharmacieId,
        medicamentId,
        lotId: lotId || null,
        type: 'TRANSFERT',
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

    // Décrémenter le stock du lot source si applicable
    if (lotId) {
      await db.lot.update({
        where: { id: lotId },
        data: { quantite: { decrement: parseInt(String(quantite), 10) } },
      })
    }

    return NextResponse.json(transfert, { status: 201 })
  } catch (error) {
    console.error('Erreur POST transferts:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du transfert' },
      { status: 500 }
    )
  }
}
