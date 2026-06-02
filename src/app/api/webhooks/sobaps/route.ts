// ============================================================
// MédiHelm — Webhook SoBAPS (Société Béninoise d'Approvisionnement Pharmaceutique)
// Réception des confirmations de réception avec validation HMAC-SHA256
// ============================================================

import { db } from '@/lib/db'
import { validateWebhookRequest } from '@/lib/webhook-security'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Validation HMAC-SHA256 avec le secret SoBAPS
  const result = await validateWebhookRequest(request, 'SOBAPS_WEBHOOK_SECRET')

  if (!result.valid) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  const body = result.body

  try {
    if (body.pharmacieId) {
      await db.confirmationReceptionSoBAPS.create({
        data: {
          pharmacieId: body.pharmacieId as string,
          bonLivraisonRef: body.bonLivraisonRef as string,
          dateReception: body.dateReception ? new Date(body.dateReception as string) : new Date(),
          statut: (body.statut ?? 'CONFORME') as string,
          ecarts: body.ecarts as Record<string, unknown> | undefined,
          webhookSent: true,
          webhookSentAt: new Date(),
        },
      })
    }

    return NextResponse.json({ message: 'Confirmation SoBAPS reçue' })
  } catch (error) {
    console.error('Erreur POST webhook SoBAPS:', error)
    return NextResponse.json({ error: 'Erreur lors du traitement' }, { status: 500 })
  }
}
