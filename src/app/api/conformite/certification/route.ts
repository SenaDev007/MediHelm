import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/conformite/certification — Statut de certification DPMED de la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult

    // Récupérer le score de conformité le plus récent
    const scoreConformite = await db.scoreConformite.findFirst({
      where: { pharmacieId: user.pharmacieId },
      orderBy: { dateCalcul: 'desc' },
    })

    // Vérifier les documents requis pour la certification
    const now = new Date()
    const documentsRequis = await db.document.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        type: { in: ['CERTIFICATION', 'LICENCE', 'REGISTRE_STUPEFIANTS', 'RAPPORT_PHARMACOVIGILANCE', 'DECLARATION_TRIMESTRIELLE'] },
      },
    })

    const documentsValides = documentsRequis.filter(
      (d) => !d.dateValidite || new Date(d.dateValidite) >= now
    )

    // Vérifier la complétude des exigences
    const exigences = {
      licenceExploitation: documentsRequis.some((d) => d.type === 'LICENCE' && (!d.dateValidite || new Date(d.dateValidite) >= now)),
      registreStupAjour: documentsRequis.some((d) => d.type === 'REGISTRE_STUPEFIANTS' && (!d.dateValidite || new Date(d.dateValidite) >= now)),
      rapportPharmacovigilance: documentsRequis.some((d) => d.type === 'RAPPORT_PHARMACOVIGILANCE' && (!d.dateValidite || new Date(d.dateValidite) >= now)),
      declarationTrimestrielle: documentsRequis.some((d) => d.type === 'DECLARATION_TRIMESTRIELLE' && (!d.dateValidite || new Date(d.dateValidite) >= now)),
      scoreMinimum80: (scoreConformite?.scoreTotal ?? 0) >= 80,
    }

    // Vérifier les alertes DPMED non acquittées
    const alertesNonAcquittees = await db.diffusionAlerte.count({
      where: {
        pharmacieId: user.pharmacieId,
        statut: { in: ['EN_ATTENTE', 'RECUE'] },
      },
    })
    exigences.alertesAcquittees = alertesNonAcquittees === 0

    // Vérifier les signalements en attente
    const signalementsEnAttente = await db.signalementEI.count({
      where: {
        pharmacieId: user.pharmacieId,
        statutEnvoi: 'EN_ATTENTE',
      },
    })
    exigences.signalementsSoumis = signalementsEnAttente === 0

    // Éligibilité à la certification
    const eligibilite = Object.values(exigences).every((v) => v === true)

    // Certification existante
    const certificationExistante = documentsRequis.find((d) => d.type === 'CERTIFICATION')

    return NextResponse.json({
      pharmacieId: user.pharmacieId,
      certificationActuelle: certificationExistante
        ? {
            id: certificationExistante.id,
            statut: certificationExistante.statut,
            dateValidite: certificationExistante.dateValidite,
            valide: !certificationExistante.dateValidite || new Date(certificationExistante.dateValidite) >= now,
          }
        : null,
      scoreConformite: scoreConformite
        ? {
            scoreTotal: scoreConformite.scoreTotal,
            certificationDPMED: scoreConformite.certificationDPMED,
            dateCalcul: scoreConformite.dateCalcul,
          }
        : null,
      eligibilite,
      exigences,
      documentsRequis: {
        total: documentsRequis.length,
        valides: documentsValides.length,
        expires: documentsRequis.length - documentsValides.length,
      },
      recommandations: getRecommandations(exigences, scoreConformite?.scoreTotal ?? 0),
    })
  } catch (error) {
    console.error('Erreur lors de la vérification de la certification:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut de certification.' },
      { status: 500 }
    )
  }
}

function getRecommandations(exigences: Record<string, boolean>, score: number): string[] {
  const recommandations: string[] = []

  if (!exigences.licenceExploitation) {
    recommandations.push('Mettre à jour la licence d\'exploitation de la pharmacie.')
  }
  if (!exigences.registreStupAjour) {
    recommandations.push('Tenir à jour le registre des stupéfiants.')
  }
  if (!exigences.rapportPharmacovigilance) {
    recommandations.push('Soumettre un rapport de pharmacovigilance à jour.')
  }
  if (!exigences.declarationTrimestrielle) {
    recommandations.push('Compléter la déclaration trimestrielle en cours.')
  }
  if (!exigences.scoreMinimum80) {
    recommandations.push(`Améliorer le score de conformité (actuel: ${score}/100, minimum requis: 80).`)
  }
  if (!exigences.alertesAcquittees) {
    recommandations.push('Acquitter toutes les alertes DPMED en attente.')
  }
  if (!exigences.signalementsSoumis) {
    recommandations.push('Soumettre tous les signalements d\'effets indésirables en attente.')
  }
  if (recommandations.length === 0) {
    recommandations.push('La pharmacie est éligible à la certification DPMED. Vous pouvez soumettre votre demande.')
  }

  return recommandations
}
