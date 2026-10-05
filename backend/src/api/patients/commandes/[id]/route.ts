import { db } from '@backend/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@backend/lib/api-auth'
import { validate, commandePatientTransitionSchema } from '@backend/lib/validations'
import { rateLimit, RATE_LIMITS } from '@backend/lib/rate-limit'
import type { StatutCommandePatient } from '@prisma/client'

// Transitions valides du cycle de vie d'une commande patient
const TRANSITIONS: Record<StatutCommandePatient, StatutCommandePatient[]> = {
  RECUE: ['EN_PREPARATION', 'ANNULEE'],
  EN_PREPARATION: ['PRETE', 'ANNULEE'],
  PRETE: ['RECUPEREE', 'ANNULEE'],
  RECUPEREE: [],
  ANNULEE: [],
}

const STATUT_LABELS: Record<StatutCommandePatient, string> = {
  RECUE: 'reçue',
  EN_PREPARATION: 'en préparation',
  PRETE: 'prête à être récupérée',
  RECUPEREE: 'récupérée',
  ANNULEE: 'annulée',
}

// Règles fidélité (CDC SitePublic §9.1)
const POINTS_PAR_100_FCFA = 1
const BONUS_PREMIERE_COMMANDE = 50
const BONUS_PAIEMENT_EN_LIGNE = 10

// PATCH /api/patients/commandes/[id] — Transition de statut d'une commande patient
// Corps: { statut: EN_PREPARATION | PRETE | RECUPEREE | ANNULEE, notes? }
// Effets de bord: notification patient à chaque changement de statut,
// crédit des points de fidélité (1 pt / 100 FCFA + bonus première commande)
// et notification dédiée lors du passage à RECUPEREE.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
    if (rateLimitResult) return rateLimitResult

    const { id } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
    }

    const validation = validate(commandePatientTransitionSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    const result = await db.$transaction(async tx => {
      // Commande verrouillée — isolation multi-tenant
      const commande = await tx.commandePatient.findFirst({
        where: {
          id,
          ...(authResult.roleName === 'PLATFORM_ADMIN' ? {} : { pharmacieId: user.pharmacieId }),
        },
        include: {
          patient: { select: { id: true, nom: true, prenom: true, utilisateurId: true, pointsFidelite: true } },
          lignes: { include: { medicament: { select: { nomCommercial: true, dci: true } } } },
        },
      })
      if (!commande) {
        throw new PatchError('Commande patient introuvable', 404)
      }

      // Machine à états
      const autorises = TRANSITIONS[commande.statut] ?? []
      if (!autorises.includes(data.statut)) {
        throw new PatchError(
          `Transition invalide: ${commande.statut} → ${data.statut}. Transitions autorisées depuis ${commande.statut}: ${autorises.join(', ') || 'aucune (statut terminal)'}`,
          409
        )
      }

      const reference = `#${commande.id.slice(-6).toUpperCase()}`

      // Passage à RECUPEREE → crédit fidélité + notification dédiée
      let pointsCredites = 0
      let nouveauSolde = commande.patient.pointsFidelite
      if (data.statut === 'RECUPEREE') {
        pointsCredites = Math.floor(commande.montantTotal / 100) * POINTS_PAR_100_FCFA
        const commandesCompleteesAvant = await tx.commandePatient.count({
          where: { patientId: commande.patientId, statut: 'RECUPEREE' },
        })
        const bonusPremiere = commandesCompleteesAvant === 0 ? BONUS_PREMIERE_COMMANDE : 0
        pointsCredites += bonusPremiere

        const patientMisAJour = await tx.patient.update({
          where: { id: commande.patientId },
          data: { pointsFidelite: { increment: pointsCredites } },
          select: { pointsFidelite: true },
        })
        nouveauSolde = patientMisAJour.pointsFidelite

        if (pointsCredites > 0 && commande.patient.utilisateurId) {
          await tx.notification.create({
            data: {
              userId: commande.patient.utilisateurId,
              titre: 'Points fidélité crédités',
              message: `+${pointsCredites} points crédités pour votre commande ${reference}${bonusPremiere ? ' (inclut le bonus de bienvenue de 50 points)' : ''}. Nouveau solde: ${nouveauSolde} points.`,
              type: 'INFO',
              lien: '/patient/fidelite',
              lue: false,
            },
          })
        }
      }

      // Notification générique de changement de statut
      if (commande.patient.utilisateurId) {
        await tx.notification.create({
          data: {
            userId: commande.patient.utilisateurId,
            titre: `Commande ${reference} ${STATUT_LABELS[data.statut]}`,
            message:
              data.statut === 'ANNULEE'
                ? `Votre commande ${reference} a été annulée par la pharmacie.`
                : `Le statut de votre commande ${reference} est désormais « ${STATUT_LABELS[data.statut]} ».`,
            type: data.statut === 'ANNULEE' ? 'ALERTE' : 'INFO',
            lien: '/patient/suivi',
            lue: false,
          },
        })
      }

      // Journal d'audit (traçabilité des mutations métier)
      await tx.auditLog.create({
        data: {
          userId: user.id,
          pharmacieId: commande.pharmacieId,
          action: 'COMMANDE_PATIENT_STATUT',
          entity: 'CommandePatient',
          entityId: commande.id,
          details: `${commande.statut} → ${data.statut}${pointsCredites ? ` | +${pointsCredites} pts fidélité` : ''}`,
        },
      })

      const miseAJour = await tx.commandePatient.update({
        where: { id: commande.id },
        data: {
          statut: data.statut,
          ...(data.notes ? { notes: data.notes } : {}),
        },
        include: {
          patient: { select: { id: true, nom: true, prenom: true, pointsFidelite: true } },
          lignes: { include: { medicament: { select: { nomCommercial: true, dci: true } } } },
        },
      })

      return { commande: miseAJour, pointsCredites, nouveauSolde }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof PatchError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Erreur PATCH patients/commandes/[id]:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    )
  }
}

class PatchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}
