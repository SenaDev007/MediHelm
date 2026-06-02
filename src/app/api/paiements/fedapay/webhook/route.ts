import { db } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/fedapay'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/paiements/fedapay/webhook — Webhook Fedapay (public)
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-fedapay-signature') || ''

    const webhookSecret = process.env.FEDAPAY_WEBHOOK_SECRET || 'fedapay-webhook-dev-secret'

    // Verify signature (skip in dev if no signature)
    if (signature && !verifyWebhookSignature(payload, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
    }

    const body = JSON.parse(payload)
    const { event, data } = body

    if (!event || !data) {
      return NextResponse.json({ error: 'Format invalide' }, { status: 400 })
    }

    // Handle webhook events
    switch (event) {
      case 'transaction.approved': {
        // Find paiement by reference (transactionId)
        const paiement = await db.paiement.findFirst({
          where: { reference: data.id || '' },
          include: { vente: true },
        })

        if (paiement && paiement.vente) {
          // Update vente status if needed
          if (paiement.vente.statut === 'EN_COURS') {
            await db.vente.update({
              where: { id: paiement.venteId },
              data: { statut: 'VALIDEE' },
            })
          }
        }
        break
      }

      case 'transaction.declined': {
        // Mark paiement as failed (we could add a status field to Paiement)
        console.log(`Transaction ${data.id} declined`)
        break
      }

      case 'transaction.cancelled': {
        console.log(`Transaction ${data.id} cancelled`)
        break
      }

      default:
        console.log(`Unhandled Fedapay event: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erreur webhook fedapay:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement du webhook' },
      { status: 500 }
    )
  }
}
