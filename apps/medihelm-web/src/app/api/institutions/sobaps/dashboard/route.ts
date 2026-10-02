import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: SOBAPS_VIEWER or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M14_DASHBOARD', 'read')
  if (auth instanceof Response) return auth

  try {
    // SoBAPS Dashboard KPIs - delivery stats, confirmation rates
    const totalCommandes = await db.ordonnanceGrossiste.count()
    const commandesEnvoyees = await db.ordonnanceGrossiste.count({
      where: { statut: 'ENVOYEE' },
    })
    const commandesConfirmees = await db.ordonnanceGrossiste.count({
      where: { statut: 'CONFIRMEE' },
    })
    const commandesLivrees = await db.ordonnanceGrossiste.count({
      where: { statut: 'LIVREE' },
    })
    const commandesEnPreparation = await db.ordonnanceGrossiste.count({
      where: { statut: 'EN_PREPARATION' },
    })

    // Receptions stats
    const totalReceptions = await db.receptionGrossiste.count()
    const receptionsCompletes = await db.receptionGrossiste.count({
      where: { statut: 'COMPLETE' },
    })
    const receptionsPartielles = await db.receptionGrossiste.count({
      where: { statut: 'PARTIELLE' },
    })

    // Monthly delivery trend (last 6 months)
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const ordonnances = await db.ordonnanceGrossiste.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, montantTotal: true, statut: true },
    })

    const monthlyTrend: Array<{ mois: string; commandes: number; livrees: number; montant: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      const monthOrders = ordonnances.filter(o => {
        const od = new Date(o.createdAt)
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear()
      })
      monthlyTrend.push({
        mois: monthStr,
        commandes: monthOrders.length,
        livrees: monthOrders.filter(o => o.statut === 'LIVREE').length,
        montant: monthOrders.reduce((acc, o) => acc + o.montantTotal, 0),
      })
    }

    // Recent confirmations (latest receptions)
    const recentConfirmations = await db.receptionGrossiste.findMany({
      take: 10,
      orderBy: { dateReception: 'desc' },
      include: {
        pharmacie: {
          select: { id: true, nom: true, ville: true },
        },
        ordonnanceGrossiste: {
          select: { id: true, reference: true, montantTotal: true },
        },
      },
    })

    // Top pharmacies by order volume
    const topPharmaciesRaw = await db.ordonnanceGrossiste.groupBy({
      by: ['pharmacieId'],
      where: { pharmacieId: { not: '' } },
      _count: { id: true },
      _sum: { montantTotal: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })

    const pharmaIds = topPharmaciesRaw
      .map(t => t.pharmacieId)
      .filter((id): id is string => id !== null && id !== '')
    const pharmaDetails = await db.pharmacie.findMany({
      where: { id: { in: pharmaIds } },
      select: { id: true, nom: true, ville: true },
    })
    const pharmaMap = new Map(pharmaDetails.map(p => [p.id, p]))

    const topPharmacies = topPharmaciesRaw.map(t => ({
      ...(t.pharmacieId ? pharmaMap.get(t.pharmacieId) : undefined),
      count: (t._count as { id: number } | undefined)?.id ?? 0,
      montant: t._sum?.montantTotal ?? 0,
    }))

    return NextResponse.json({
      kpis: {
        totalCommandes,
        commandesEnvoyees,
        commandesConfirmees,
        commandesLivrees,
        commandesEnPreparation,
        totalReceptions,
        receptionsCompletes,
        receptionsPartielles,
        tauxLivraison: totalCommandes > 0
          ? Math.round((commandesLivrees / totalCommandes) * 100)
          : 0,
      },
      monthlyTrend,
      recentConfirmations,
      topPharmacies,
    })
  } catch (error) {
    console.error('Erreur dashboard SoBAPS:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du tableau de bord SoBAPS' },
      { status: 500 }
    )
  }
}
