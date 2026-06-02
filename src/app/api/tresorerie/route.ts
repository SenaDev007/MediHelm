import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    // Récupérer la dernière entrée de trésorerie
    const latestTresorerie = await db.tresorerie.findFirst({
      where: { pharmacieId },
      orderBy: { date: 'desc' },
    })

    // Calculer les soldes à partir des ventes et paiements
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const ventesToday = await db.vente.findMany({
      where: {
        pharmacieId,
        statut: 'VALIDEE',
        createdAt: { gte: today },
      },
      include: { paiements: true },
    })

    let soldeCaisse = latestTresorerie?.soldeCaisse ?? 0
    let soldeBanque = latestTresorerie?.soldeBanque ?? 0
    let soldeMobileMoney = latestTresorerie?.soldeMobileMoney ?? 0

    // Ajouter les paiements du jour
    for (const vente of ventesToday) {
      for (const paiement of vente.paiements) {
        switch (paiement.modePaiement) {
          case 'ESPECES':
            soldeCaisse += paiement.montant
            break
          case 'CARTE':
            soldeBanque += paiement.montant
            break
          case 'WAVE':
          case 'MTN_MONEY':
          case 'MOOV_MONEY':
          case 'MOBILE_MONEY':
            soldeMobileMoney += paiement.montant
            break
        }
      }
    }

    return NextResponse.json({
      soldeCaisse,
      soldeBanque,
      soldeMobileMoney,
      total: soldeCaisse + soldeBanque + soldeMobileMoney,
      dernierUpdate: latestTresorerie?.date || null,
    })
  } catch (error) {
    console.error('Erreur GET tresorerie:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération de la trésorerie' }, { status: 500 })
  }
}
