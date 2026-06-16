import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, verifyTransaction } from '@/lib/fedapay'

// POST /api/paiements/fedapay/webhook — Webhook Fedapay (pas d'auth requise)
export async function POST(request: NextRequest) {
  try {
    // Lire le body brut pour la vérification de signature
    const rawBody = await request.text()
    const signature = request.headers.get('x-fedapay-signature') || ''

    // Vérifier la signature HMAC du webhook
    if (signature && !verifyWebhookSignature(signature, rawBody)) {
      return NextResponse.json(
        { error: 'Signature de webhook invalide' },
        { status: 401 }
      )
    }

    // Si pas de signature header mais qu'une clé Fedapay est configurée, on rejette
    if (!signature && process.env.FEDAPAY_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Signature de webhook manquante' },
        { status: 401 }
      )
    }

    const body = JSON.parse(rawBody)
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

    // Vérifier la transaction directement via l'API Fedapay pour confirmation
    let fedapayTransaction: Awaited<ReturnType<typeof verifyTransaction>> | null = null
    if (data.id && process.env.FEDAPAY_SECRET_KEY) {
      try {
        fedapayTransaction = await verifyTransaction(data.id)
      } catch (error) {
        console.warn('[Fedapay Webhook] Impossible de vérifier la transaction via API:', error)
        // On continue avec les données du webhook
      }
    }

    // Déterminer le statut réel : priorité à la vérification API, sinon au webhook
    const effectiveStatus = fedapayTransaction
      ? fedapayTransaction.status
      : getFedapayEventStatus(event)

    // Mettre à jour le statut du paiement selon l'événement
    switch (effectiveStatus) {
      case 'approved':
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

      case 'declined':
      case 'payment.failed':
      case 'transaction.declined': {
        await db.paiement.update({
          where: { id: paiement.id },
          data: { statut: 'ECHEC' },
        })
        break
      }

      case 'canceled': {
        await db.paiement.update({
          where: { id: paiement.id },
          data: { statut: 'EN_ATTENTE' },
        })
        break
      }

      case 'refunded':
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
      statut: getPaiementStatut(effectiveStatus),
      verifiedViaApi: !!fedapayTransaction,
    })
  } catch (error) {
    console.error('Erreur webhook Fedapay:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement du webhook Fedapay' },
      { status: 500 }
    )
  }
}

function getFedapayEventStatus(event: string): string {
  switch (event) {
    case 'payment.completed':
    case 'transaction.approved':
      return 'approved'
    case 'payment.failed':
    case 'transaction.declined':
      return 'declined'
    case 'payment.refunded':
      return 'refunded'
    case 'payment.canceled':
      return 'canceled'
    default:
      return event
  }
}

function getPaiementStatut(status: string): string {
  switch (status) {
    case 'approved':
    case 'payment.completed':
    case 'transaction.approved':
      return 'REUSSI'
    case 'declined':
    case 'payment.failed':
    case 'transaction.declined':
      return 'ECHEC'
    case 'canceled':
    case 'payment.canceled':
      return 'ANNULE'
    case 'refunded':
    case 'payment.refunded':
      return 'REMBOURSE'
    default:
      return 'EN_ATTENTE'
  }
}
