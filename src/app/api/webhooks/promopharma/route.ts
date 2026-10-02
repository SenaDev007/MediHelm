// ============================================================
// MediHelm — Webhook Promopharma
// Réception des mises à jour de statut de commande
// Validation HMAC-SHA256 + IP whitelist
// Référence: MH-SPECS-2025-v2.0
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyWebhookHMAC, getWebhookSignature, isIPWhitelisted, getClientIP } from '@/lib/webhook-hmac'

export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer le corps brut pour la vérification de signature
    const rawBody = await request.text()

    // 2. Extract client IP and verify whitelist
    const clientIp = getClientIP(request)
    if (!isIPWhitelisted('promopharma', clientIp)) {
      console.warn(`[Promopharma Webhook] IP non autorisée: ${clientIp}`)
      return NextResponse.json(
        { error: `IP ${clientIp} non autorisée`, code: 'MH-SEC-002' },
        { status: 403 }
      )
    }

    // 3. Vérifier la signature HMAC-SHA256
    const signature = getWebhookSignature(request, 'promopharma')
    const secret = process.env.PROMOPHARMA_WEBHOOK_SECRET

    if (!secret) {
      return NextResponse.json(
        { error: 'Webhook Promopharma non configuré', code: 'MH-SEC-003' },
        { status: 503 }
      )
    }
    if (!signature || !verifyWebhookHMAC('promopharma', rawBody, signature)) {
      return NextResponse.json(
        { error: 'Signature invalide ou manquante', code: 'MH-SEC-001' },
        { status: 401 }
      )
    }

    // 4. Parser le corps de la requête
    let data: Record<string, unknown>
    try {
      data = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide' },
        { status: 400 }
      )
    }

    const { reference, statut, grossisteId, event } = data as {
      reference?: string
      statut?: string
      grossisteId?: string
      event?: string
    }

    // 5. Valider les champs obligatoires
    if (!reference) {
      return NextResponse.json(
        { error: 'Référence de commande manquante' },
        { status: 400 }
      )
    }

    // 6. Trouver la commande par référence
    const commande = await db.commandeGrossiste.findUnique({
      where: { reference },
    })

    if (!commande) {
      return NextResponse.json(
        { error: 'Commande non trouvée pour la référence fournie' },
        { status: 404 }
      )
    }

    // 7. Mapper le statut de l'événement vers le statut interne
    const statusMap: Record<string, string> = {
      'order.confirmed': 'CONFIRMEE',
      'order.preparing': 'EN_PREPARATION',
      'order.shipped': 'EN_PREPARATION',
      'order.delivered': 'LIVREE',
      'order.partially_delivered': 'LIVREE_PARTIELLEMENT',
      'order.cancelled': 'ANNULEE',
      'confirmed': 'CONFIRMEE',
      'preparing': 'EN_PREPARATION',
      'shipped': 'EN_PREPARATION',
      'delivered': 'LIVREE',
      'partially_delivered': 'LIVREE_PARTIELLEMENT',
      'cancelled': 'ANNULEE',
    }

    const newStatut = statut && statusMap[statut]
      ? statusMap[statut]
      : event && statusMap[event]
        ? statusMap[event]
        : null

    if (!newStatut) {
      return NextResponse.json(
        { error: `Statut non reconnu : ${statut || event}` },
        { status: 400 }
      )
    }

    // 8. Mettre à jour la commande
    await db.commandeGrossiste.update({
      where: { id: commande.id },
      data: { statut: newStatut as 'BROUILLON' | 'ENVOYEE' | 'CONFIRMEE' | 'EN_PREPARATION' | 'LIVREE_PARTIELLEMENT' | 'LIVREE' | 'ANNULEE' },
    })

    // 9. Journaliser l'événement
    await db.auditLog.create({
      data: {
        userId: null,
        action: 'WEBHOOK_PROMOPHARMA_STATUS_UPDATE',
        entity: 'CommandeGrossiste',
        entityId: commande.id,
        details: JSON.stringify({
          reference,
          ancienStatut: commande.statut,
          nouveauStatut: newStatut,
          event: event || statut,
          grossisteId: grossisteId || commande.grossisteId,
          clientIp,
        }),
      },
    })

    return NextResponse.json({
      message: 'Statut de commande mis à jour avec succès',
      commandeId: commande.id,
      nouveauStatut: newStatut,
    }, { status: 200 })

  } catch (error) {
    console.error('[Promopharma Webhook] Erreur traitement:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors du traitement du webhook' },
      { status: 500 }
    )
  }
}
