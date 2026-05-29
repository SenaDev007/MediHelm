import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Anonymized aggregate data only - no individual pharmacy data
    const totalPharmacies = await db.pharmacie.count({ where: { actif: true } })

    // Aggregate by city
    const parVille = await db.pharmacie.groupBy({
      by: ['ville'],
      where: { actif: true },
      _count: { id: true },
    })

    // Aggregate by department
    const parDepartement = await db.pharmacie.groupBy({
      by: ['departement'],
      where: { actif: true },
      _count: { id: true },
    })

    // Supply tension from medication surveillance (aggregated)
    const alertesActives = await db.medicamentSurveillance.count({
      where: { statut: 'ACTIVE' },
    })

    const alertesParType = await db.medicamentSurveillance.groupBy({
      by: ['typeSurveillance'],
      where: { statut: 'ACTIVE' },
      _count: { id: true },
    })

    // Signalements EI by gravity (anonymized)
    const signalementsParGravite = await db.signalementEI.groupBy({
      by: ['gravite'],
      _count: { id: true },
    })

    // Average compliance score (anonymized aggregate)
    const avgScore = await db.scoreConformite.aggregate({
      _avg: { scoreTotal: true },
      _count: { id: true },
    })

    // DPMED alerts by type (aggregated)
    const alertesDPMEDParType = await db.alerteDPMED.groupBy({
      by: ['typeAlerte'],
      _count: { id: true },
    })

    // Distribution statistics from SoBAPS confirmations
    const confirmationsTotal = await db.confirmationReceptionSoBAPS.count()
    const confirmationsParStatut = await db.confirmationReceptionSoBAPS.groupBy({
      by: ['statut'],
      _count: { id: true },
    })

    // Subscription plan distribution
    const parPlan = await db.pharmacie.groupBy({
      by: ['plan'],
      where: { actif: true },
      _count: { id: true },
    })

    return NextResponse.json({
      pharmacies: {
        total: totalPharmacies,
        parVille: parVille.map(p => ({ ville: p.ville, count: p._count.id })),
        parDepartement: parDepartement.map(p => ({ departement: p.departement, count: p._count.id })),
        parPlan: parPlan.map(p => ({ plan: p.plan, count: p._count.id })),
      },
      tensions: {
        alertesActives,
        parTypeSurveillance: alertesParType.map(a => ({ type: a.typeSurveillance, count: a._count.id })),
        alertesDPMEDParType: alertesDPMEDParType.map(a => ({ type: a.typeAlerte, count: a._count.id })),
      },
      pharmacovigilance: {
        signalementsParGravite: signalementsParGravite.map(s => ({ gravite: s.gravite, count: s._count.id })),
      },
      conformite: {
        scoreMoyen: avgScore._avg.scoreTotal ? Math.round(avgScore._avg.scoreTotal) : 0,
        nbEvalues: avgScore._count.id,
      },
      distribution: {
        totalConfirmations: confirmationsTotal,
        parStatut: confirmationsParStatut.map(c => ({ statut: c.statut, count: c._count.id })),
      },
    })
  } catch (error) {
    console.error('Erreur GET analytics ABRP:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
