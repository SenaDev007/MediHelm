import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reseauId = searchParams.get('reseauId')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (reseauId) where.reseauId = reseauId
    if (statut) where.statut = statut

    const data = await db.transfertStock.findMany({
      where,
      include: {
        pharmacieSource: { select: { id: true, nom: true } },
        pharmacieDest: { select: { id: true, nom: true } },
        medicament: { select: { id: true, nomCommercial: true, dci: true } },
      },
      orderBy: { dateDemande: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET transferts:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des transferts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reseauId, pharmacieSourceId, pharmacieDestId, medicamentId, quantite } = body

    if (!reseauId || !pharmacieSourceId || !pharmacieDestId || !medicamentId || !quantite) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    const data = await db.transfertStock.create({
      data: {
        reseauId,
        pharmacieSourceId,
        pharmacieDestId,
        medicamentId,
        quantite: parseInt(String(quantite)),
        statut: 'DEMANDE',
      },
      include: {
        pharmacieSource: { select: { id: true, nom: true } },
        pharmacieDest: { select: { id: true, nom: true } },
        medicament: { select: { id: true, nomCommercial: true, dci: true } },
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST transferts:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du transfert' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id requis (query param)' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.statut !== undefined) updateData.statut = body.statut
    if (body.statut === 'EFFECTUE') updateData.dateEffectuee = new Date()

    const updated = await db.transfertStock.update({
      where: { id },
      data: updateData,
      include: {
        pharmacieSource: { select: { id: true, nom: true } },
        pharmacieDest: { select: { id: true, nom: true } },
        medicament: { select: { id: true, nomCommercial: true, dci: true } },
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH transferts:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du transfert' }, { status: 500 })
  }
}
