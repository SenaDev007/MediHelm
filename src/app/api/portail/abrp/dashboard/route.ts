import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const pharmacies = await db.pharmacie.findMany({
      where: { actif: true },
      select: {
        id: true,
        ville: true,
        plan: true,
        statutAbonnement: true,
      },
    })

    const totalPharmacies = pharmacies.length

    const parVille: Record<string, number> = {}
    for (const p of pharmacies) {
      parVille[p.ville] = (parVille[p.ville] || 0) + 1
    }

    const parPlan: Record<string, number> = {}
    for (const p of pharmacies) {
      parPlan[p.plan] = (parPlan[p.plan] || 0) + 1
    }

    const alertesActives = await db.alerteDPMED.count({
      where: { statut: 'EN_DIFFUSION' },
    })

    const surveillances = await db.medicamentSurveillance.findMany({
      where: { statut: 'ACTIVE' },
      select: { niveauRisque: true },
    })

    const pharmacovigilanceParGravite: Record<string, number> = {}
    for (const s of surveillances) {
      pharmacovigilanceParGravite[s.niveauRisque] = (pharmacovigilanceParGravite[s.niveauRisque] || 0) + 1
    }

    const scores = await db.scoreConformite.findMany({
      select: { scoreTotal: true },
    })

    const avgScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.scoreTotal, 0) / scores.length
      : 0

    return NextResponse.json({
      totalPharmacies,
      repartitionParVille: Object.entries(parVille).map(([ville, count]) => ({ ville, count })),
      repartitionParPlan: Object.entries(parPlan).map(([plan, count]) => ({ plan, count })),
      tensionsApprovisionnement: alertesActives,
      pharmacovigilanceParGravite: Object.entries(pharmacovigilanceParGravite).map(([niveau, count]) => ({ niveau, count })),
      scoreConformiteMoyen: Math.round(avgScore * 10) / 10,
    })
  } catch (error) {
    console.error('Erreur GET dashboard ABRP:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
