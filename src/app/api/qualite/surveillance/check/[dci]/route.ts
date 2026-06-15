import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/qualite/surveillance/check/[dci] — Vérifier si une DCI est sous surveillance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dci: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
    if (authResult instanceof Response) return authResult

    const { dci } = await params
    const dciDecoded = decodeURIComponent(dci)

    // Récupérer les surveillances actives pour cette DCI
    const surveillances = await db.medicamentSurveillance.findMany({
      where: {
        dci: { equals: dciDecoded, mode: 'insensitive' },
        statut: 'ACTIVE',
      },
      orderBy: { niveauRisque: 'desc' },
    })

    // Récupérer les alertes DPMED pour cette DCI
    const alertesDPMED = await db.alerteDPMED.findMany({
      where: {
        dciConcernee: { equals: dciDecoded, mode: 'insensitive' },
        statut: 'EN_DIFFUSION',
      },
      orderBy: { niveauUrgence: 'desc' },
    })

    // Déterminer le niveau de risque global
    const niveauRisqueGlobal = getNiveauRisqueGlobal(surveillances)

    // Déterminer si la DCI est sous surveillance
    const estSousSurveillance = surveillances.length > 0

    return NextResponse.json({
      dci: dciDecoded,
      estSousSurveillance,
      niveauRisqueGlobal,
      surveillances: surveillances.map((s) => ({
        id: s.id,
        typeSurveillance: s.typeSurveillance,
        niveauRisque: s.niveauRisque,
        description: s.description,
        sourceAlerte: s.sourceAlerte,
        dateEmission: s.dateEmission,
      })),
      alertesDPMED: alertesDPMED.map((a) => ({
        id: a.id,
        reference: a.referenceOfficielle,
        titre: a.titre,
        typeAlerte: a.typeAlerte,
        niveauUrgence: a.niveauUrgence,
        dateEmission: a.dateEmissionDPMED,
      })),
      recommandation: estSousSurveillance
        ? getRecommandation(niveauRisqueGlobal, surveillances)
        : 'Aucune surveillance active pour cette DCI.',
    })
  } catch (error) {
    console.error('Erreur lors de la vérification de surveillance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de la surveillance de la DCI.' },
      { status: 500 }
    )
  }
}

function getNiveauRisqueGlobal(surveillances: { niveauRisque: string }[]): string {
  if (surveillances.some((s) => s.niveauRisque === 'CRITIQUE')) return 'CRITIQUE'
  if (surveillances.some((s) => s.niveauRisque === 'ELEVE')) return 'ELEVE'
  if (surveillances.some((s) => s.niveauRisque === 'MODERE')) return 'MODERE'
  if (surveillances.some((s) => s.niveauRisque === 'FAIBLE')) return 'FAIBLE'
  return 'AUCUN'
}

function getRecommandation(niveau: string, surveillances: { typeSurveillance: string }[]): string {
  const hasRappel = surveillances.some((s) => s.typeSurveillance === 'RAPPEL_LOT')
  const hasContrefacon = surveillances.some((s) => s.typeSurveillance === 'CONTREFACON')
  const hasInterdiction = surveillances.some((s) => s.typeSurveillance === 'INTERDICTION')
  const hasAmmSuspendue = surveillances.some((s) => s.typeSurveillance === 'AMM_SUSPENDUE')

  if (hasInterdiction) return 'INTERDICTION — Ne pas dispenser ce médicament. Retirer du stock immédiatement.'
  if (hasAmmSuspendue) return 'AMM SUSPENDUE — Ne pas dispenser. Contacter le DPMED pour plus d\'informations.'
  if (hasContrefacon) return 'CONTREFACON — Vérifier l\'authenticité du lot avant toute dispensation. Ne pas dispenser en cas de doute.'
  if (hasRappel) return 'RAPPEL DE LOT — Vérifier les numéros de lots concernés. Retirer les lots visés du stock.'
  if (niveau === 'CRITIQUE') return 'RISQUE CRITIQUE — Surveillance renforcée requise. Évaluer la pertinence de la dispensation.'
  if (niveau === 'ELEVE') return 'RISQUE ÉLEVÉ — Pharmacien responsable à consulter avant dispensation.'
  if (niveau === 'MODERE') return 'RISQUE MODÉRÉ — Surveillance normale. Informer le patient des risques.'
  return 'SURVEILLANCE — DCI sous surveillance. Consulter les recommandations officielles.'
}
