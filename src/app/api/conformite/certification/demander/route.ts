import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'
import { validate, certificationSchema } from '@/lib/validations'

// POST /api/conformite/certification/demander — Demander la certification DPMED
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'write')
    if (authResult instanceof Response) return authResult

    const user = authResult

    // Seuls ADMIN et DIRECTEUR peuvent demander la certification
    if (user.roleName !== 'ADMIN' && user.roleName !== 'DIRECTEUR' && user.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs et directeurs peuvent demander la certification DPMED.' },
        { status: 403 }
      )
    }

    // Vérifier les prérequis d'éligibilité
    const now = new Date()

    // Vérifier le score de conformité
    const scoreConformite = await db.scoreConformite.findFirst({
      where: { pharmacieId: user.pharmacieId },
      orderBy: { dateCalcul: 'desc' },
    })

    if (!scoreConformite || scoreConformite.scoreTotal < 80) {
      return NextResponse.json(
        { error: `Score de conformité insuffisant. Score actuel: ${scoreConformite?.scoreTotal ?? 0}/100. Minimum requis: 80.` },
        { status: 400 }
      )
    }

    // Vérifier les documents requis
    const documentsRequis = await db.document.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        type: { in: ['LICENCE', 'REGISTRE_STUPEFIANTS'] },
      },
    })

    const licenceValide = documentsRequis.some(
      (d) => d.type === 'LICENCE' && (!d.dateValidite || new Date(d.dateValidite) >= now)
    )
    if (!licenceValide) {
      return NextResponse.json(
        { error: 'Licence d\'exploitation manquante ou expirée. Veuillez mettre à jour votre licence avant de demander la certification.' },
        { status: 400 }
      )
    }

    // Vérifier qu'il n'y a pas déjà une certification en cours
    const certificationExistante = await db.document.findFirst({
      where: {
        pharmacieId: user.pharmacieId,
        type: 'CERTIFICATION',
        statut: { in: ['BROUILLON', 'EN_COURS'] },
      },
    })

    if (certificationExistante) {
      return NextResponse.json(
        { error: 'Une demande de certification est déjà en cours. Veuillez attendre sa validation.' },
        { status: 400 }
      )
    }

    // Vérifier les alertes DPMED non acquittées
    const alertesNonAcquittees = await db.diffusionAlerte.count({
      where: {
        pharmacieId: user.pharmacieId,
        statut: { in: ['EN_ATTENTE', 'RECUE'] },
      },
    })

    if (alertesNonAcquittees > 0) {
      return NextResponse.json(
        { error: `${alertesNonAcquittees} alerte(s) DPMED non acquittée(s). Veuillez les traiter avant de demander la certification.` },
        { status: 400 }
      )
    }

    // Vérifier les signalements en attente
    const signalementsEnAttente = await db.signalementEI.count({
      where: {
        pharmacieId: user.pharmacieId,
        statutEnvoi: 'EN_ATTENTE',
      },
    })

    if (signalementsEnAttente > 0) {
      return NextResponse.json(
        { error: `${signalementsEnAttente} signalement(s) d'effets indésirables en attente. Veuillez les soumettre avant de demander la certification.` },
        { status: 400 }
      )
    }

    // Créer la demande de certification
    const body = await request.json().catch(() => ({}))
    const validation = validate(certificationSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const certData = validation.data
    const certification = await db.document.create({
      data: {
        pharmacieId: user.pharmacieId,
        type: 'CERTIFICATION',
        titre: `Demande de certification DPMED — ${new Date().toLocaleDateString('fr-FR')}`,
        statut: 'EN_COURS',
        dateValidite: null,
        creePar: user.id,
      },
    })

    // Mettre à jour le score de conformité
    await db.scoreConformite.create({
      data: {
        pharmacieId: user.pharmacieId,
        scoreTotal: scoreConformite.scoreTotal,
        scoreRegistreStup: scoreConformite.scoreRegistreStup,
        scoreAlerteDPMED: scoreConformite.scoreAlerteDPMED,
        scoreDocuments: scoreConformite.scoreDocuments,
        scorePharmacovigilance: scoreConformite.scorePharmacovigilance,
        scoreDestructions: scoreConformite.scoreDestructions,
        certificationDPMED: false,
        dateCalcul: now,
      },
    })

    // Enregistrer dans l'audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'DEMANDE_CERTIFICATION_DPMED',
        entity: 'Document',
        entityId: certification.id,
        details: JSON.stringify({
          pharmacieId: user.pharmacieId,
          scoreConformite: scoreConformite.scoreTotal,
        }),
      },
    })

    return NextResponse.json({
      message: 'Demande de certification DPMED soumise avec succès.',
      certification: {
        id: certification.id,
        titre: certification.titre,
        statut: certification.statut,
        dateCreation: certification.createdAt,
      },
      scoreConformite: scoreConformite.scoreTotal,
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la demande de certification:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la demande de certification DPMED.' },
      { status: 500 }
    )
  }
}
