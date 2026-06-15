import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/conformite/exports/pharmacovigilance-mensuel — Rapport pharmacovigilance mensuel
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { searchParams } = new URL(request.url)

    // Paramètres de période (mois)
    const annee = parseInt(searchParams.get('annee') || new Date().getFullYear().toString())
    const mois = parseInt(searchParams.get('mois') || String(new Date().getMonth() + 1))

    if (mois < 1 || mois > 12) {
      return NextResponse.json(
        { error: 'Mois invalide. Valeurs autorisées: 1-12.' },
        { status: 400 }
      )
    }

    const dateDebut = new Date(annee, mois - 1, 1)
    const dateFin = new Date(annee, mois, 0, 23, 59, 59)
    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

    // Récupérer les signalements du mois
    const signalements = await db.signalementEI.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        createdAt: { gte: dateDebut, lte: dateFin },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Récupérer les surveillances actives
    const surveillancesActives = await db.medicamentSurveillance.findMany({
      where: { statut: 'ACTIVE' },
      orderBy: { niveauRisque: 'desc' },
    })

    // Récupérer les alertes DPMED du mois
    const alertesDPMED = await db.alerteDPMED.findMany({
      where: {
        dateEmissionDPMED: { gte: dateDebut, lte: dateFin },
      },
      include: {
        diffusions: {
          where: { pharmacieId: user.pharmacieId },
          select: { statut: true, dateAcquittement: true },
        },
      },
      orderBy: { dateEmissionDPMED: 'desc' },
    })

    // Statistiques des signalements
    const parGravite: Record<string, number> = {}
    const parStatut: Record<string, number> = {}
    const parDci: Record<string, number> = {}

    for (const s of signalements) {
      parGravite[s.gravite] = (parGravite[s.gravite] || 0) + 1
      parStatut[s.statutEnvoi] = (parStatut[s.statutEnvoi] || 0) + 1
      parDci[s.dciConcernee] = (parDci[s.dciConcernee] || 0) + 1
    }

    // Top DCI signalées
    const topDcisSignalees = Object.entries(parDci)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([dci, count]) => ({ dci, count }))

    // Statistiques des alertes DPMED
    const alertesParType: Record<string, number> = {}
    for (const a of alertesDPMED) {
      alertesParType[a.typeAlerte] = (alertesParType[a.typeAlerte] || 0) + 1
    }

    const alertesAcquittees = alertesDPMED.filter(
      (a) => a.diffusions.some((d) => d.statut === 'ACQUITTEE')
    ).length

    // Signalements en attente
    const signalementsEnAttente = await db.signalementEI.count({
      where: {
        pharmacieId: user.pharmacieId,
        statutEnvoi: 'EN_ATTENTE',
      },
    })

    // Signalements graves non clôturés
    const signalementsGraves = await db.signalementEI.count({
      where: {
        pharmacieId: user.pharmacieId,
        gravite: { in: ['GRAVE', 'VITAL'] },
        statutEnvoi: { not: 'CLOTURE' },
      },
    })

    return NextResponse.json({
      periode: {
        annee,
        mois,
        label: `${moisNoms[mois - 1]} ${annee}`,
        dateDebut,
        dateFin,
      },
      pharmacieId: user.pharmacieId,
      signalements: {
        total: signalements.length,
        parGravite,
        parStatut,
        parDci: topDcisSignalees,
        enAttente: signalementsEnAttente,
        gravesNonClotures: signalementsGraves,
        details: signalements.map((s) => ({
          id: s.id,
          dciConcernee: s.dciConcernee,
          descriptionEI: s.descriptionEI,
          gravite: s.gravite,
          statutEnvoi: s.statutEnvoi,
          dateDebut: s.dateDebut,
          refDPMED: s.refDPMED,
          createdAt: s.createdAt,
        })),
      },
      surveillances: {
        actives: surveillancesActives.length,
        parNiveauRisque: surveillancesActives.reduce((acc, s) => {
          acc[s.niveauRisque] = (acc[s.niveauRisque] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        parType: surveillancesActives.reduce((acc, s) => {
          acc[s.typeSurveillance] = (acc[s.typeSurveillance] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      },
      alertesDPMED: {
        total: alertesDPMED.length,
        acquittees: alertesAcquittees,
        nonAcquittees: alertesDPMED.length - alertesAcquittees,
        parType: alertesParType,
        details: alertesDPMED.map((a) => ({
          id: a.id,
          reference: a.referenceOfficielle,
          titre: a.titre,
          typeAlerte: a.typeAlerte,
          niveauUrgence: a.niveauUrgence,
          dciConcernee: a.dciConcernee,
          dateEmission: a.dateEmissionDPMED,
          diffusionStatut: a.diffusions[0]?.statut || 'NON_DIFFUSEE',
          dateAcquittement: a.diffusions[0]?.dateAcquittement || null,
        })),
      },
      recommandations: [
        ...(signalementsEnAttente > 0 ? [`${signalementsEnAttente} signalement(s) en attente nécessitant une soumission au DPMED`] : []),
        ...(signalementsGraves > 0 ? [`${signalementsGraves} signalement(s) grave(s) non clôturé(s) — suivi requis`] : []),
        ...(alertesDPMED.length - alertesAcquittees > 0 ? [`${alertesDPMED.length - alertesAcquittees} alerte(s) DPMED non acquittée(s)`] : []),
        ...(signalementsEnAttente === 0 && signalementsGraves === 0 ? ['Aucune action urgente requise'] : []),
      ],
      dateGeneration: new Date(),
    })
  } catch (error) {
    console.error('Erreur lors de la génération du rapport pharmacovigilance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport de pharmacovigilance mensuel.' },
      { status: 500 }
    )
  }
}
