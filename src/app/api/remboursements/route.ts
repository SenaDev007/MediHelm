import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId

    const data = await db.remboursement.findMany({
      where,
      include: {
        vente: { select: { id: true, montantTotal: true, createdAt: true } },
        tiersPayant: {
          select: {
            id: true,
            patient: { select: { nom: true, prenom: true } },
            organisme: { select: { nom: true, code: true } },
          },
        },
      },
      orderBy: { dateSoumission: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET remboursements:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des remboursements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Get the tiers payant to calculate prise en charge
    const tiersPayant = await db.tiersPayant.findUnique({
      where: { id: body.tiersPayantId },
      include: { organisme: true },
    })

    if (!tiersPayant) {
      return NextResponse.json({ error: 'Tiers payant non trouvé' }, { status: 404 })
    }

    const montantTotal = body.montantTotal
    const tauxPriseEnCharge = body.tauxPriseEnCharge || tiersPayant.tauxPriseEnCharge
    const montantPrisEnCharge = Math.round(montantTotal * tauxPriseEnCharge / 100)
    const montantPatient = montantTotal - montantPrisEnCharge

    const data = await db.remboursement.create({
      data: {
        pharmacieId: body.pharmacieId,
        venteId: body.venteId,
        tiersPayantId: body.tiersPayantId,
        montantTotal,
        montantPrisEnCharge,
        montantPatient,
        statut: body.statut || 'SOUMIS',
        dateSoumission: new Date(),
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST remboursements:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du remboursement' }, { status: 500 })
  }
}
