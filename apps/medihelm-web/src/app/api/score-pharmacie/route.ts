import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/score-pharmacie — Score de conformité de la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId

    // Récupérer le score le plus récent
    const scoreRecent = await db.scoreConformite.findFirst({
      where: { pharmacieId },
      orderBy: { dateCalcul: 'desc' },
    })

    // Récupérer l'historique des scores
    const historique = await db.scoreConformite.findMany({
      where: { pharmacieId },
      orderBy: { dateCalcul: 'desc' },
      take: 12,
    })

    if (!scoreRecent) {
      return NextResponse.json({
        scoreGlobal: 0,
        categories: {
          registreStup: { score: 0, label: 'Registre Stupéfiants' },
          alerteDPMED: { score: 0, label: 'Alertes DPMED' },
          documents: { score: 0, label: 'Documents' },
          pharmacovigilance: { score: 0, label: 'Pharmacovigilance' },
          destructions: { score: 0, label: 'Destructions' },
        },
        certificationDPMED: false,
        dateCalcul: null,
        historique: [],
        recommandations: [
          'Commencez par compléter le registre des stupéfiants',
          'Vérifiez la réception des alertes DPMED',
          'Mettez à jour vos documents de conformité',
        ],
      })
    }

    // Construire les catégories de scores
    const categories = {
      registreStup: {
        score: scoreRecent.scoreRegistreStup,
        label: 'Registre Stupéfiants',
        maxScore: 100,
      },
      alerteDPMED: {
        score: scoreRecent.scoreAlerteDPMED,
        label: 'Alertes DPMED',
        maxScore: 100,
      },
      documents: {
        score: scoreRecent.scoreDocuments,
        label: 'Documents',
        maxScore: 100,
      },
      pharmacovigilance: {
        score: scoreRecent.scorePharmacovigilance,
        label: 'Pharmacovigilance',
        maxScore: 100,
      },
      destructions: {
        score: scoreRecent.scoreDestructions,
        label: 'Destructions',
        maxScore: 100,
      },
    }

    // Calculer le score global (moyenne pondérée)
    const scoreGlobal = scoreRecent.scoreTotal

    // Générer des recommandations basées sur les scores faibles
    const recommandations: string[] = []
    if (scoreRecent.scoreRegistreStup < 70) {
      recommandations.push('Améliorez la tenue du registre des stupéfiants (score actuel: ' + scoreRecent.scoreRegistreStup + '/100)')
    }
    if (scoreRecent.scoreAlerteDPMED < 70) {
      recommandations.push('Assurez-vous d\'acquitter toutes les alertes DPMED reçues (score actuel: ' + scoreRecent.scoreAlerteDPMED + '/100)')
    }
    if (scoreRecent.scoreDocuments < 70) {
      recommandations.push('Mettez à jour vos documents réglementaires (score actuel: ' + scoreRecent.scoreDocuments + '/100)')
    }
    if (scoreRecent.scorePharmacovigilance < 70) {
      recommandations.push('Renforcez vos procédures de pharmacovigilance (score actuel: ' + scoreRecent.scorePharmacovigilance + '/100)')
    }
    if (scoreRecent.scoreDestructions < 70) {
      recommandations.push('Complétez les registres de destruction (score actuel: ' + scoreRecent.scoreDestructions + '/100)')
    }

    // Vérifier le statut des alertes DPMED non acquittées
    const alertesNonAcquittees = await db.diffusionAlerte.count({
      where: {
        pharmacieId,
        statut: { in: ['EN_ATTENTE', 'RECUE'] },
      },
    })

    if (alertesNonAcquittees > 0) {
      recommandations.push(`Vous avez ${alertesNonAcquittees} alerte(s) DPMED non acquittée(s)`)
    }

    // Évolution du score dans le temps
    const evolution = historique.map((h) => ({
      date: h.dateCalcul.toISOString(),
      scoreTotal: h.scoreTotal,
      scoreRegistreStup: h.scoreRegistreStup,
      scoreAlerteDPMED: h.scoreAlerteDPMED,
      scoreDocuments: h.scoreDocuments,
      scorePharmacovigilance: h.scorePharmacovigilance,
      scoreDestructions: h.scoreDestructions,
    }))

    // Niveau de conformité
    let niveauConformite: string
    if (scoreGlobal >= 90) {
      niveauConformite = 'EXCELLENT'
    } else if (scoreGlobal >= 75) {
      niveauConformite = 'BON'
    } else if (scoreGlobal >= 50) {
      niveauConformite = 'MOYEN'
    } else {
      niveauConformite = 'INSUFFISANT'
    }

    return NextResponse.json({
      scoreGlobal,
      niveauConformite,
      categories,
      certificationDPMED: scoreRecent.certificationDPMED,
      dateCalcul: scoreRecent.dateCalcul.toISOString(),
      evolution,
      alertesNonAcquittees,
      recommandations,
    })
  } catch (error) {
    console.error('Erreur GET score-pharmacie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du score de conformité' },
      { status: 500 }
    )
  }
}
