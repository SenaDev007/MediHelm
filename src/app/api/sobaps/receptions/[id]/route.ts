// ============================================================
// MediHelm — Détail d'une réception SoBAPS
// GET /api/sobaps/receptions/[id]
// PATCH /api/sobaps/receptions/[id]
// Permission : M03_COMMANDES read/write
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET — Récupérer le détail d'une réception
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    // 2. Récupérer la réception
    const reception = await db.receptionGrossiste.findUnique({
      where: { id },
      include: {
        ordonnanceGrossiste: {
          select: {
            id: true,
            reference: true,
            statut: true,
            montantTotal: true,
            dateLivraison: true,
            createdAt: true,
            lignes: true,
          },
        },
        pharmacie: {
          select: {
            id: true,
            nom: true,
            adresse: true,
            ville: true,
            telephone: true,
          },
        },
      },
    })

    if (!reception) {
      return NextResponse.json(
        { error: 'Réception non trouvée' },
        { status: 404 }
      )
    }

    // 3. Vérifier l'accès à la pharmacie
    if (reception.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette réception n\'appartient pas à votre pharmacie.' },
        { status: 403 }
      )
    }

    // 4. Retourner les détails
    return NextResponse.json(reception)

  } catch (error) {
    console.error('Erreur récupération réception SoBAPS:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la réception' },
      { status: 500 }
    )
  }
}

/**
 * PATCH — Mettre à jour une réception (statut de conformité)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    // 2. Parser le corps de la requête
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide' },
        { status: 400 }
      )
    }

    const { statut, notes } = body as { statut?: string; notes?: string }

    // 3. Récupérer la réception existante
    const existing = await db.receptionGrossiste.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Réception non trouvée' },
        { status: 404 }
      )
    }

    // 4. Vérifier l'accès à la pharmacie
    if (existing.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette réception n\'appartient pas à votre pharmacie.' },
        { status: 403 }
      )
    }

    // 5. Valider le statut
    const validStatuts = ['PARTIELLE', 'COMPLETE', 'NON_CONFORME', 'CONFORME']
    if (statut && !validStatuts.includes(statut)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs acceptées : ${validStatuts.join(', ')}` },
        { status: 400 }
      )
    }

    // 6. Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {}
    if (statut) updateData.statut = statut
    if (notes !== undefined) updateData.notes = notes

    // 7. Mettre à jour la réception
    const updatedReception = await db.receptionGrossiste.update({
      where: { id },
      data: updateData,
    })

    // 8. Journaliser
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'RECEPTION_SOBAPS_MISE_A_JOUR',
        entity: 'ReceptionGrossiste',
        entityId: id,
        details: JSON.stringify({
          ancienStatut: existing.statut,
          nouveauStatut: statut || existing.statut,
          pharmacieId: user.pharmacieId,
          modifications: updateData,
        }),
      },
    })

    return NextResponse.json({
      message: 'Réception mise à jour avec succès',
      reception: updatedReception,
    }, { status: 200 })

  } catch (error) {
    console.error('Erreur mise à jour réception SoBAPS:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la réception' },
      { status: 500 }
    )
  }
}
