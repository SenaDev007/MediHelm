import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: DPMED_ADMIN or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M14_DASHBOARD', 'read')
  if (auth instanceof Response) return auth

  try {
    // Aggregate alert counts from AlerteDPMED
    const totalAlertes = await db.alerteDPMED.count()
    const alertesEnCours = await db.alerteDPMED.count({
      where: { statut: 'EN_DIFFUSION' },
    })
    const alertesAcquittees = await db.alerteDPMED.count({
      where: { statut: 'ACQUITTEE' },
    })
    const alertesExpirees = await db.alerteDPMED.count({
      where: { statut: 'EXPIREE' },
    })
    const alertesAnnulees = await db.alerteDPMED.count({
      where: { statut: 'ANNULEE' },
    })

    // Acquittal rates from DiffusionAlerte
    const totalDiffusions = await db.diffusionAlerte.count()
    const diffusionsAcquittees = await db.diffusionAlerte.count({
      where: { statut: 'ACQUITTEE' },
    })
    const diffusionsRecues = await db.diffusionAlerte.count({
      where: { statut: 'RECUE' },
    })
    const diffusionsEnAttente = await db.diffusionAlerte.count({
      where: { statut: 'EN_ATTENTE' },
    })
    const tauxAcquittement = totalDiffusions > 0
      ? Math.round((diffusionsAcquittees / totalDiffusions) * 100)
      : 0

    // Compliance stats from ScoreConformite
    const scores = await db.scoreConformite.findMany()
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((acc, s) => acc + s.scoreTotal, 0) / scores.length)
      : 0
    const certifiedCount = scores.filter(s => s.certificationDPMED).length
    const below70Count = scores.filter(s => s.scoreTotal < 70).length

    // Alerts by type
    const alertesParType = await db.alerteDPMED.groupBy({
      by: ['typeAlerte'],
      _count: { id: true },
    })

    // Alerts by urgency
    const alertesParUrgence = await db.alerteDPMED.groupBy({
      by: ['niveauUrgence'],
      _count: { id: true },
    })

    // Recent alerts with diffusion info
    const alertesRecentes = await db.alerteDPMED.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        diffusions: {
          select: {
            id: true,
            statut: true,
            pharmacieId: true,
          },
        },
      },
    })

    // Monthly trend (last 6 months)
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const alertesMois = await db.alerteDPMED.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, statut: true },
    })

    const monthlyTrend: Array<{ mois: string; total: number; acquittées: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      const monthAlerts = alertesMois.filter(a => {
        const ad = new Date(a.createdAt)
        return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear()
      })
      monthlyTrend.push({
        mois: monthStr,
        total: monthAlerts.length,
        acquittées: monthAlerts.filter(a => a.statut === 'ACQUITTEE').length,
      })
    }

    return NextResponse.json({
      kpis: {
        totalAlertes,
        alertesEnCours,
        alertesAcquittees,
        alertesExpirees,
        alertesAnnulees,
        tauxAcquittement,
        avgScoreConformite: avgScore,
        pharmaciesCertifiees: certifiedCount,
        pharmaciesSous70: below70Count,
        totalDiffusions,
        diffusionsAcquittees,
      },
      alertesParType: alertesParType.map(a => ({
        type: a.typeAlerte,
        count: a._count.id,
      })),
      alertesParUrgence: alertesParUrgence.map(a => ({
        urgence: a.niveauUrgence,
        count: a._count.id,
      })),
      alertesRecentes,
      monthlyTrend,
    })
  } catch (error) {
    console.error('Erreur dashboard DPMED:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du tableau de bord' },
      { status: 500 }
    )
  }
}
