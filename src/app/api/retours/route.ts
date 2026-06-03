import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId

    const data = await db.retour.findMany({
      where,
      include: {
        medicament: { select: { nomCommercial: true, dci: true, estStupefiant: true } },
        lot: { select: { numeroLot: true, dateExpiration: true } },
        fournisseur: { select: { nom: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET retours:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des retours' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const retour = await db.retour.create({
      data: {
        pharmacieId: body.pharmacieId,
        medicamentId: body.medicamentId,
        lotId: body.lotId || null,
        typeRetour: body.typeRetour,
        quantite: body.quantite,
        motif: body.motif,
        fournisseurId: body.fournisseurId || null,
        statut: body.statut || 'EN_COURS',
      },
    })

    // Adjust lot quantity if lot specified
    if (body.lotId) {
      const lot = await db.lot.findUnique({ where: { id: body.lotId } })
      if (lot) {
        await db.lot.update({
          where: { id: body.lotId },
          data: { quantite: Math.max(0, lot.quantite - body.quantite) },
        })
      }
    }

    return NextResponse.json(retour, { status: 201 })
  } catch (error) {
    console.error('Erreur POST retours:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du retour' }, { status: 500 })
  }
}
