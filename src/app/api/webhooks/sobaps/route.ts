// ============================================================
// MediHelm — Webhook SoBAPS (Service Béninois d'Approvisionnement Pharmaceutique)
// Réception des confirmations de livraison
// Validation par secret partagé
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // 1. Valider le secret
    const secret = request.headers.get('X-Webhook-Secret')
    const expectedSecret = process.env.SOBAPS_WEBHOOK_SECRET

    if (!expectedSecret) {
      console.error('[SoBAPS Webhook] Secret SOBAPS_WEBHOOK_SECRET non configuré')
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

    const {
      ordonnanceGrossisteId,
      pharmacieId,
      dateReception,
      statut,
      notes,
      lignes,
    } = data as {
      ordonnanceGrossisteId?: string
      pharmacieId?: string
      dateReception?: string
      statut?: string
      notes?: string
      lignes?: Array<{ dci: string; quantiteLivre: number }>
    }

    // 3. Valider les champs obligatoires
    if (!ordonnanceGrossisteId || !pharmacieId) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants : ordonnanceGrossisteId, pharmacieId' },
        { status: 400 }
      )
    }

    // 4. Vérifier que la pharmacie existe
    const pharmacie = await db.pharmacie.findUnique({
      where: { id: pharmacieId },
    })
    if (!pharmacie) {
      return NextResponse.json(
        { error: 'Pharmacie non trouvée' },
        { status: 404 }
      )
    }

    // 5. Vérifier que l'ordonnance grossiste existe
    const ordonnance = await db.ordonnanceGrossiste.findUnique({
      where: { id: ordonnanceGrossisteId },
    })
    if (!ordonnance) {
      return NextResponse.json(
        { error: 'Ordonnance grossiste non trouvée' },
        { status: 404 }
      )
    }

    // 6. Vérifier si une réception existe déjà
    const existingReception = await db.receptionGrossiste.findUnique({
      where: { ordonnanceGrossisteId },
    })

    let reception

    if (existingReception) {
      // Mettre à jour la réception existante
      reception = await db.receptionGrossiste.update({
        where: { id: existingReception.id },
        data: {
          dateReception: dateReception ? new Date(dateReception) : new Date(),
          statut: statut || 'PARTIELLE',
          notes: notes || existingReception.notes,
        },
      })
    } else {
      // Créer une nouvelle réception
      reception = await db.receptionGrossiste.create({
        data: {
          pharmacieId,
          ordonnanceGrossisteId,
          dateReception: dateReception ? new Date(dateReception) : new Date(),
          statut: statut || 'PARTIELLE',
          notes: notes || null,
        },
      })
    }

    // 7. Mettre à jour les quantités livrées des lignes si fournies
    if (lignes && Array.isArray(lignes) && lignes.length > 0) {
      for (const ligne of lignes) {
        const ligneOG = await db.ligneOrdonnanceGrossiste.findFirst({
          where: {
            ordonnanceId: ordonnanceGrossisteId,
            dci: ligne.dci,
          },
        })
        if (ligneOG) {
          await db.ligneOrdonnanceGrossiste.update({
            where: { id: ligneOG.id },
            data: { quantiteLivre: ligne.quantiteLivre },
          })
        }
      }
    }

    // 8. Mettre à jour le statut de l'ordonnance grossiste
    await db.ordonnanceGrossiste.update({
      where: { id: ordonnanceGrossisteId },
      data: {
        statut: statut === 'COMPLETE' ? 'LIVREE' : 'LIVREE_PARTIELLEMENT',
        dateLivraison: new Date(),
      },
    })

    // 9. Journaliser
    await db.auditLog.create({
      data: {
        userId: null,
        action: 'WEBHOOK_SOBAPS_RECEPTION',
        entity: 'ReceptionGrossiste',
        entityId: reception.id,
        details: JSON.stringify({
          ordonnanceGrossisteId,
          pharmacieId,
          statut: statut || 'PARTIELLE',
        }),
      },
    })

    return NextResponse.json({
      message: 'Réception enregistrée avec succès',
      receptionId: reception.id,
    }, { status: 200 })

  } catch (error) {
    console.error('[SoBAPS Webhook] Erreur traitement:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors du traitement du webhook' },
      { status: 500 }
    )
  }
}
