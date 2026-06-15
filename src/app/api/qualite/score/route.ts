import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/qualite/score — Score qualité de la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult

    // Récupérer ou calculer le score de conformité
    let scoreConformite = await db.scoreConformite.findFirst({
      where: { pharmacieId: user.pharmacieId },
      orderBy: { dateCalcul: 'desc' },
    })

    // Si aucun score n'existe, le calculer
    if (!scoreConformite) {
      scoreConformite = await calculerScore(user.pharmacieId)
    }

    // Statistiques de pharmacovigilance
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const signalementsEnAttente = await db.signalementEI.count({
      where: { pharmacieId: user.pharmacieId, statutEnvoi: 'EN_ATTENTE' },
    })

    const signalementsMois = await db.signalementEI.count({
      where: {
        pharmacieId: user.pharmacieId,
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    const signalementsGraves = await db.signalementEI.count({
      where: {
        pharmacieId: user.pharmacieId,
        gravite: { in: ['GRAVE', 'VITAL'] },
      },
    })

    // Statistiques de surveillance
    const surveillancesActives = await db.medicamentSurveillance.count({
      where: { statut: 'ACTIVE' },
    })

    // Vérifier la conformité des alertes DPMED
    const alertesNonAcquittees = await db.diffusionAlerte.count({
      where: {
        pharmacieId: user.pharmacieId,
        statut: { in: ['EN_ATTENTE', 'RECUE'] },
      },
    })

    // Complétude des documents
    const documentsRequis = await db.document.count({
      where: { pharmacieId: user.pharmacieId },
    })

    const documentsValides = await db.document.count({
      where: {
        pharmacieId: user.pharmacieId,
        dateValidite: { gte: now },
      },
    })

    const documentsExpires = await db.document.count({
      where: {
        pharmacieId: user.pharmacieId,
        dateValidite: { lt: now },
      },
    })

    // Détails du score
    const details = {
      pharmacovigilance: {
        score: scoreConformite.scorePharmacovigilance,
        signalementsEnAttente,
        signalementsMois,
        signalementsGraves,
        recommandation: signalementsEnAttente > 0
          ? `${signalementsEnAttente} signalement(s) en attente de soumission`
          : 'Tous les signalements ont été soumis',
      },
      surveillance: {
        score: scoreConformite.scoreAlerteDPMED,
        surveillancesActives,
        alertesNonAcquittees,
        recommandation: alertesNonAcquittees > 0
          ? `${alertesNonAcquittees} alerte(s) DPMED non acquittée(s)`
          : 'Toutes les alertes DPMED ont été acquittées',
      },
      documents: {
        score: scoreConformite.scoreDocuments,
        documentsRequis,
        documentsValides,
        documentsExpires,
        recommandation: documentsExpires > 0
          ? `${documentsExpires} document(s) expiré(s) nécessitant une mise à jour`
          : 'Tous les documents sont à jour',
      },
      registreStup: {
        score: scoreConformite.scoreRegistreStup,
        recommandation: 'Vérifier la tenue du registre des stupéfiants',
      },
      destructions: {
        score: scoreConformite.scoreDestructions,
        recommandation: 'Vérifier la traçabilité des destructions',
      },
    }

    return NextResponse.json({
      scoreTotal: scoreConformite.scoreTotal,
      certificationDPMED: scoreConformite.certificationDPMED,
      dateCalcul: scoreConformite.dateCalcul,
      details,
    })
  } catch (error) {
    console.error('Erreur lors du calcul du score qualité:', error)
    return NextResponse.json(
      { error: 'Erreur lors du calcul du score qualité.' },
      { status: 500 }
    )
  }
}

// Calculer le score de conformité pour une pharmacie
async function calculerScore(pharmacieId: string) {
  const now = new Date()

  // Score pharmacovigilance (0-100)
  const signalementsEnAttente = await db.signalementEI.count({
    where: { pharmacieId, statutEnvoi: 'EN_ATTENTE' },
  })
  const signalementsTotal = await db.signalementEI.count({
    where: { pharmacieId },
  })
  const signalementsSoumis = await db.signalementEI.count({
    where: { pharmacieId, statutEnvoi: { in: ['SOUMIS', 'ACQUITTE', 'CLOTURE'] } },
  })
  const scorePharmacovigilance = signalementsTotal === 0
    ? 100
    : Math.round((signalementsSoumis / signalementsTotal) * 100)

  // Score alertes DPMED (0-100)
  const alertesTotal = await db.diffusionAlerte.count({
    where: { pharmacieId },
  })
  const alertesAcquittees = await db.diffusionAlerte.count({
    where: { pharmacieId, statut: { in: ['ACQUITTEE', 'NON_CONCERNEE'] } },
  })
  const scoreAlerteDPMED = alertesTotal === 0
    ? 100
    : Math.round((alertesAcquittees / alertesTotal) * 100)

  // Score documents (0-100)
  const documentsTotal = await db.document.count({ where: { pharmacieId } })
  const documentsValides = await db.document.count({
    where: { pharmacieId, dateValidite: { gte: now } },
  })
  const scoreDocuments = documentsTotal === 0
    ? 50 // Score moyen si aucun document
    : Math.round((documentsValides / documentsTotal) * 100)

  // Score registre stupéfiants (vérification simplifiée)
  const registreStup = await db.document.count({
    where: { pharmacieId, type: 'REGISTRE_STUPEFIANTS', dateValidite: { gte: now } },
  })
  const scoreRegistreStup = registreStup > 0 ? 100 : 50

  // Score destructions (vérification simplifiée)
  const rapportDestruction = await db.document.count({
    where: { pharmacieId, type: 'RAPPORT_DESTRUCTION', dateValidite: { gte: now } },
  })
  const scoreDestructions = rapportDestruction > 0 ? 100 : 50

  // Score total (pondéré)
  const scoreTotal = Math.round(
    scorePharmacovigilance * 0.3 +
    scoreAlerteDPMED * 0.25 +
    scoreDocuments * 0.2 +
    scoreRegistreStup * 0.15 +
    scoreDestructions * 0.1
  )

  // Sauvegarder le score
  const score = await db.scoreConformite.create({
    data: {
      pharmacieId,
      scoreTotal,
      scorePharmacovigilance,
      scoreAlerteDPMED,
      scoreDocuments,
      scoreRegistreStup,
      scoreDestructions,
      certificationDPMED: scoreTotal >= 80,
      dateCalcul: now,
    },
  })

  return score
}
