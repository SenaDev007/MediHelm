// ============================================================
// MediHelm — Webhook UbiPharm
// Réception des mises à jour de statut de commande
// Validation par secret partagé
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // 1. Valider le secret
    const secret = request.headers.get('X-Webhook-Secret')
    const expectedSecret = process.env.UBIPHARM_WEBHOOK_SECRET

    if (!expectedSecret) {
      console.error('[UbiPharm Webhook] Secret UBIPHARM_WEBHOOK_SECRET non configuré')
      return NextResponse.json(
        { error: 'Configuration serveur incomplète' },
        { status: 500 }
      )
    }

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Secret webhook invalide' },
        { status: 401 }
      )
    }

    // 2. Parser le corps de la requête
    let data: Record<string, unknown>
    try {
      data = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide' },
        { status: 400 }
      )
    }

    const { reference, statut, event, montantTotal, dateLivraisonPrevue } = data as {
      reference?: string
      statut?: string
      event?: string
      montantTotal?: number
      dateLivraisonPrevue?: string
    }

    // 3. Valider les champs obligatoires
    if (!reference) {
      return NextResponse.json(
        { error: 'Référence de commande manquante' },
        { status: 400 }
      )
    }

    // 4. Trouver la commande par référence
    const commande = await db.commandeGrossiste.findUnique({
      where: { reference },
    })

    if (!commande) {
      return NextResponse.json(
        { error: 'Commande non trouvée pour la référence fournie' },
        { status: 404 }
      )
    }

    // 5. Mapper le statut de l'événement vers le statut interne
    const statusMap: Record<string, string> = {
      'order.confirmed': 'CONFIRMEE',
      'order.preparing': 'EN_PREPARATION',
      'order.in_transit': 'EN_PREPARATION',
      'order.delivered': 'LIVREE',
      'order.partially_delivered': 'LIVREE_PARTIELLEMENT',
      'order.cancelled': 'ANNULEE',
      'confirmed': 'CONFIRMEE',
      'preparing': 'EN_PREPARATION',
      'in_transit': 'EN_PREPARATION',
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

    // 6. Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {
      statut: newStatut as 'BROUILLON' | 'ENVOYEE' | 'CONFIRMEE' | 'EN_PREPARATION' | 'LIVREE_PARTIELLEMENT' | 'LIVREE' | 'ANNULEE',
    }

    if (montantTotal !== undefined && montantTotal !== null) {
      updateData.montantTotal = montantTotal
    }

    // 7. Mettre à jour la commande
    await db.commandeGrossiste.update({
      where: { id: commande.id },
      data: updateData,
    })

    // 8. Journaliser l'événement
    await db.auditLog.create({
      data: {
        userId: null,
        action: 'WEBHOOK_UBIPHARM_STATUS_UPDATE',
        entity: 'CommandeGrossiste',
        entityId: commande.id,
        details: JSON.stringify({
          reference,
          ancienStatut: commande.statut,
          nouveauStatut: newStatut,
          event: event || statut,
          montantTotal,
          dateLivraisonPrevue,
        }),
      },
    })

    return NextResponse.json({
      message: 'Statut de commande mis à jour avec succès',
      commandeId: commande.id,
      nouveauStatut: newStatut,
    }, { status: 200 })

  } catch (error) {
    console.error('[UbiPharm Webhook] Erreur traitement:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors du traitement du webhook' },
      { status: 500 }
    )
  }
}
