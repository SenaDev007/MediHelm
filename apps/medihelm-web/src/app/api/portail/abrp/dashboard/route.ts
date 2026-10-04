import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: ABRP_VIEWER or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M15_ANALYTICS', 'read')
  if (auth instanceof Response) return auth

  try {
    // Anonymized market analytics for ABRP

    // Total pharmacies
    const totalPharmacies = await db.pharmacie.count({ where: { actif: true } })

    // Pharmacies by city (anonymized)
    const pharmaciesParVille = await db.pharmacie.groupBy({
      by: ['ville'],
      where: { actif: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    // Supply tension indicators - based on stock alerts
    const alertesRupture = await db.alerteStock.count({
      where: { type: 'RUPTURE' },
    })
    const alertesSeuilMin = await db.alerteStock.count({
      where: { type: 'SEUIL_MINIMUM' },
    })

    // Most frequently out-of-stock DCIs (anonymized)
    const dciTensions = await db.alerteStock.groupBy({
      by: ['medicamentId'],
      where: { type: { in: ['RUPTURE', 'SEUIL_MINIMUM'] } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    // Get DCI names for the tension items
    const medicamentIds = dciTensions.map(d => d.medicamentId)
    const medicaments = await db.medicament.findMany({
      where: { id: { in: medicamentIds } },
      select: { id: true, dci: true },
    })
    const dciMap = new Map(medicaments.map(m => [m.id, m.dci]))

    const tensionsDCI = dciTensions.map(t => ({
      dci: dciMap.get(t.medicamentId) || 'Inconnu',
      count: t._count.id,
      niveau: t._count.id > 10 ? 'CRITIQUE' : t._count.id > 5 ? 'ELEVE' : 'MODERE',
    }))

    // Orders trend (anonymized)
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const commandesMois = await db.commandeFournisseur.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, montantTotal: true, statut: true },
    })

    const monthlyTrend: Array<{ mois: string; commandes: number; montant: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      const monthOrders = commandesMois.filter(c => {
        const cd = new Date(c.createdAt)
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
      })
      monthlyTrend.push({
        mois: monthStr,
        commandes: monthOrders.length,
        montant: monthOrders.reduce((acc, c) => acc + c.montantTotal, 0),
      })
    }

    // Average compliance score
    const scores = await db.scoreConformite.findMany({
      select: { scoreTotal: true },
    })
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((acc, s) => acc + s.scoreTotal, 0) / scores.length)
      : 0

    // Signalements EI count (anonymized)
    const signalementsTotal = await db.signalementEI.count()
    const signalementsParGravite = await db.signalementEI.groupBy({
      by: ['gravite'],
      _count: { id: true },
    })

    return NextResponse.json({
      kpis: {
        totalPharmacies,
        alertesRupture,
        alertesSeuilMin,
        avgScoreConformite: avgScore,
        signalementsTotal,
      },
      pharmaciesParVille: pharmaciesParVille.map(p => ({
        ville: p.ville,
        count: p._count.id,
      })),
      tensionsDCI,
      monthlyTrend,
      signalementsParGravite: signalementsParGravite.map(s => ({
        gravite: s.gravite,
        count: s._count.id,
      })),
    })
  } catch (error) {
    console.error('Erreur dashboard ABRP:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du tableau de bord' },
      { status: 500 }
    )
  }
}
