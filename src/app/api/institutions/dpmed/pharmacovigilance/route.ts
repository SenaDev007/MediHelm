import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Total signalements
    const totalSignalements = await db.signalementEI.count()

    // Par gravité
    const parGravite = await db.signalementEI.groupBy({
      by: ['gravite'],
      _count: { id: true },
    })

    // Par statut envoi
    const parStatut = await db.signalementEI.groupBy({
      by: ['statutEnvoi'],
      _count: { id: true },
    })

    // Par DCI (top 10)
    const parDCI = await db.signalementEI.groupBy({
      by: ['dciConcernee'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    // Par pharmacie (anonymized for overview)
    const parPharmacie = await db.signalementEI.groupBy({
      by: ['pharmacieId'],
      _count: { id: true },
    })

    // Get pharmacy cities for regional breakdown
    const pharmacyIds = parPharmacie.map(p => p.pharmacieId)
    const pharmacies = await db.pharmacie.findMany({
      where: { id: { in: pharmacyIds } },
      select: { id: true, ville: true, departement: true },
    })
    const pharmacyMap = new Map(pharmacies.map(p => [p.id, p]))

    // Par région
    const parRegion: Record<string, number> = {}
    parPharmacie.forEach(p => {
      const ville = pharmacyMap.get(p.pharmacieId)?.ville || 'Inconnue'
      parRegion[ville] = (parRegion[ville] || 0) + p._count.id
    })

    // Recent signalements
    const recentSignalements = await db.signalementEI.findMany({
      include: {
        pharmacie: { select: { nom: true, ville: true } },
        medicament: { select: { dci: true, nomCommercial: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Médicaments sous surveillance
    const medicamentsSurveillance = await db.medicamentSurveillance.findMany({
      where: { statut: 'ACTIVE' },
      include: {
        _count: { select: { signalementsEI: true, alertesDPMED: true } },
      },
      orderBy: { dateEmission: 'desc' },
    })

    // Signalements over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentByDay = await db.signalementEI.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, gravite: true },
    })

    const byDay: Record<string, { leger: number; modere: number; grave: number; fatal: number }> = {}
    recentByDay.forEach(s => {
      const day = new Date(s.createdAt).toISOString().split('T')[0]
      if (!byDay[day]) byDay[day] = { leger: 0, modere: 0, grave: 0, fatal: 0 }
      const key = s.gravite.toLowerCase() as keyof typeof byDay[string]
      if (key in byDay[day]) byDay[day][key]++
    })

    const dailyStats = Object.entries(byDay)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      total: totalSignalements,
      parGravite: parGravite.map(p => ({ gravite: p.gravite, count: p._count.id })),
      parStatut: parStatut.map(p => ({ statut: p.statutEnvoi, count: p._count.id })),
      parDCI: parDCI.map(p => ({ dci: p.dciConcernee, count: p._count.id })),
      parRegion: Object.entries(parRegion)
        .map(([ville, count]) => ({ ville, count }))
        .sort((a, b) => b.count - a.count),
      recentSignalements,
      medicamentsSurveillance,
      dailyStats,
    })
  } catch (error) {
    console.error('Erreur GET pharmacovigilance:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
