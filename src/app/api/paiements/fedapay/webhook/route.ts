import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/paiements/fedapay/webhook — Webhook Fedapay (pas d'auth requise)
export async function POST(request: NextRequest) {
  try {
    // Vérifier le secret du webhook
    const webhookSecret = request.headers.get('x-fedapay-signature')
    const expectedSecret = process.env.FEDAPAY_WEBHOOK_SECRET || 'medihelm-fedapay-webhook-secret'

    if (!webhookSecret || webhookSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Signature de webhook invalide' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { event, data } = body

    if (!event || !data) {
      return NextResponse.json(
        { error: 'Format de webhook invalide' },
        { status: 400 }
      )
    }

    // Trouver le paiement par référence
    const reference = data.reference || data.transaction_id
    if (!reference) {
      return NextResponse.json(
        { error: 'Référence de transaction manquante' },
        { status: 400 }
      )
    }

    const paiement = await db.paiement.findFirst({
      where: { reference },
    })

    if (!paiement) {
      return NextResponse.json(
        { error: 'Paiement non trouvé pour cette référence' },
        { status: 404 }
      )
    }

    // Mettre à jour le statut du paiement selon l'événement
    switch (event) {
      case 'payment.completed':
      case 'transaction.approved': {
        await db.paiement.update({
          where: { id: paiement.id },
          data: { statut: 'REUSSI' },
        })

        // Mettre à jour le montant payé de la vente
        const vente = await db.vente.findUnique({
          where: { id: paiement.venteId },
          include: { paiements: true },
        })

        if (vente) {
          const montantPayeTotal = vente.paiements
            .filter((p) => p.statut === 'REUSSI')
            .reduce((sum, p) => sum + p.montant, 0)

          await db.vente.update({
            where: { id: vente.id },
            data: { montantPaye: montantPayeTotal },
          })
        }
        break
      }

      case 'payment.failed':
      case 'transaction.declined': {
        await db.paiement.update({
          where: { id: paiement.id },
          data: { statut: 'ECHEC' },
        })
        break
      }

      case 'payment.refunded': {
        await db.paiement.update({
          where: { id: paiement.id },
          data: { statut: 'REMBOURSE' },
        })
        break
      }

      default:
        // Événement non géré, on ne fait rien mais on accuse réception
        break
    }

    return NextResponse.json({
      received: true,
      event,
      paiementId: paiement.id,
      statut: getPaiementStatut(event),
    })
  } catch (error) {
    console.error('Erreur webhook Fedapay:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement du webhook Fedapay' },
      { status: 500 }
    )
  }
}

function getPaiementStatut(event: string): string {
  switch (event) {
    case 'payment.completed':
    case 'transaction.approved':
      return 'REUSSI'
    case 'payment.failed':
    case 'transaction.declined':
      return 'ECHEC'
    case 'payment.refunded':
      return 'REMBOURSE'
    default:
      return 'EN_ATTENTE'
  }
}
