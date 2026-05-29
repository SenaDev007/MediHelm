import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const totalConfirmations = await db.confirmationReceptionSoBAPS.count()
    const conformes = await db.confirmationReceptionSoBAPS.count({
      where: { statut: 'CONFORME' },
    })
    const avecEcart = await db.confirmationReceptionSoBAPS.count({
      where: { statut: 'AVEC_ECART' },
    })
    const refus = await db.confirmationReceptionSoBAPS.count({
      where: { statut: 'REFUSE' },
    })

    // Confirmations by pharmacy (with pharmacy name)
    const parPharmacie = await db.confirmationReceptionSoBAPS.groupBy({
      by: ['pharmacieId'],
      _count: { id: true },
    })

    // Get pharmacy names
    const pharmacyIds = parPharmacie.map(p => p.pharmacieId)
    const pharmacies = await db.pharmacie.findMany({
      where: { id: { in: pharmacyIds } },
      select: { id: true, nom: true, ville: true },
    })

    const pharmacyMap = new Map(pharmacies.map(p => [p.id, p]))

    const recentConfirmations = await db.confirmationReceptionSoBAPS.findMany({
      include: {
        pharmacie: { select: { id: true, nom: true, ville: true } },
      },
      orderBy: { dateReception: 'desc' },
      take: 20,
    })

    // Confirmations by date (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentByDay = await db.confirmationReceptionSoBAPS.findMany({
      where: { dateReception: { gte: thirtyDaysAgo } },
      select: { dateReception: true, statut: true },
    })

    // Group by day
    const byDay: Record<string, { conformes: number; ecarts: number; refus: number }> = {}
    recentByDay.forEach(c => {
      const day = new Date(c.dateReception).toISOString().split('T')[0]
      if (!byDay[day]) byDay[day] = { conformes: 0, ecarts: 0, refus: 0 }
      if (c.statut === 'CONFORME') byDay[day].conformes++
      else if (c.statut === 'AVEC_ECART') byDay[day].ecarts++
      else byDay[day].refus++
    })

    const dailyStats = Object.entries(byDay)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      total: totalConfirmations,
      conformes,
      avecEcart,
      refus,
      tauxConformite: totalConfirmations > 0 ? Math.round((conformes / totalConfirmations) * 100) : 0,
      recentConfirmations,
      parPharmacie: parPharmacie.map(p => ({
        pharmacieId: p.pharmacieId,
        pharmacie: pharmacyMap.get(p.pharmacieId)?.nom || 'Inconnue',
        ville: pharmacyMap.get(p.pharmacieId)?.ville || '-',
        count: p._count.id,
      })).sort((a, b) => b.count - a.count),
      dailyStats,
    })
  } catch (error) {
    console.error('Erreur GET dashboard SoBAPS:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
