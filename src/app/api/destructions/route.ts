import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId

    const data = await db.destructionMedicament.findMany({
      where,
      include: {
        medicament: { select: { nomCommercial: true, dci: true, estStupefiant: true } },
        lot: { select: { numeroLot: true, dateExpiration: true } },
        pharmacien: { select: { nom: true, prenom: true } },
        temoin: { select: { nom: true, prenom: true } },
      },
      orderBy: { dateDestruction: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET destructions:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des destructions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const destruction = await db.destructionMedicament.create({
      data: {
        pharmacieId: body.pharmacieId,
        medicamentId: body.medicamentId,
        lotId: body.lotId,
        quantite: body.quantite,
        motif: body.motif,
        dateDestruction: new Date(body.dateDestruction),
        pharmacienId: body.pharmacienId,
        temoinId: body.temoinId || null,
        statut: body.statut || 'PLANIFIEE',
      },
    })

    // Adjust lot quantity
    const lot = await db.lot.findUnique({ where: { id: body.lotId } })
    if (lot) {
      await db.lot.update({
        where: { id: body.lotId },
        data: { quantite: Math.max(0, lot.quantite - body.quantite) },
      })
    }

    return NextResponse.json(destruction, { status: 201 })
  } catch (error) {
    console.error('Erreur POST destructions:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la destruction' }, { status: 500 })
  }
}
