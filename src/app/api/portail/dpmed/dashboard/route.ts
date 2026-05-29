import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const totalAlertes = await db.alerteDPMED.count()
    const alertesActives = await db.alerteDPMED.count({
      where: { statut: 'EN_DIFFUSION' },
    })
    const alertesDiffusees = await db.alerteDPMED.count({
      where: { statut: 'DIFFUSEE' },
    })
    const diffusions = await db.diffusionAlerte.findMany({
      select: { pharmacieId: true, dateAcquittement: true },
    })
    const uniquePharmacies = new Set(diffusions.map((d) => d.pharmacieId))
    const totalPharmacies = uniquePharmacies.size
    const totalDiffusions = diffusions.length
    const acquittees = diffusions.filter((d) => d.dateAcquittement !== null).length

    const parType = await db.alerteDPMED.groupBy({
      by: ['typeAlerte'],
      _count: { id: true },
    })

    const parUrgence = await db.alerteDPMED.groupBy({
      by: ['niveauUrgence'],
      _count: { id: true },
    })

    return NextResponse.json({
      totalAlertes,
      alertesActives,
      alertesDiffusees,
      totalPharmacies,
      tauxAcquittement: totalDiffusions > 0 ? ((acquittees / totalDiffusions) * 100).toFixed(1) : '0',
      repartitionParType: parType.map((p) => ({ type: p.typeAlerte, count: p._count.id })),
      repartitionParUrgence: parUrgence.map((p) => ({ niveau: p.niveauUrgence, count: p._count.id })),
    })
  } catch (error) {
    console.error('Erreur GET dashboard DPMED:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des statistiques' }, { status: 500 })
  }
}
