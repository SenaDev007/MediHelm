// ============================================================
// MédiHelm — Webhook UbiPharm
// Réception des confirmations de commande avec validation HMAC-SHA256
// ============================================================

import { db } from '@/lib/db'
import { validateWebhookRequest } from '@/lib/webhook-security'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Validation HMAC-SHA256 avec le secret UbiPharm
  const result = await validateWebhookRequest(request, 'UBIPHARM_WEBHOOK_SECRET')

  if (!result.valid) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  const body = result.body

  try {
    if (body.referenceCommande) {
      const commande = await db.commandeGrossiste.findFirst({
        where: { referenceGrossiste: body.referenceCommande as string },
      })

      if (commande) {
        await db.commandeGrossiste.update({
          where: { id: commande.id },
          data: {
            statut: (body.statut ?? 'CONFIRMEE') as string,
            dateConfirmation: new Date(),
            reponseGrossiste: body as Record<string, unknown>,
          },
        })
      }
    }

    return NextResponse.json({ message: 'Confirmation UbiPharm reçue' })
  } catch (error) {
    console.error('Erreur POST webhook UbiPharm:', error)
    return NextResponse.json({ error: 'Erreur lors du traitement' }, { status: 500 })
  }
}
