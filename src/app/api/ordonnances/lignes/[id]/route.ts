// ============================================================
// MediHelm — Ligne d'ordonnance (détail et mise à jour)
// GET /api/ordonnances/lignes/[id]
// PATCH /api/ordonnances/lignes/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET — Récupérer le détail d'une ligne d'ordonnance
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M06_ORDONNANCES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    // 2. Récupérer la ligne avec l'ordonnance
    const ligne = await db.ligneOrdonnance.findUnique({
      where: { id },
      include: {
        ordonnance: {
          select: {
            id: true,
            pharmacieId: true,
            statut: true,
            patientId: true,
            prescripteur: true,
            dateOrdonnance: true,
          },
        },
      },
    })

    if (!ligne) {
      return NextResponse.json(
        { error: 'Ligne d\'ordonnance non trouvée' },
        { status: 404 }
      )
    }

    // 3. Vérifier l'accès à la pharmacie
    if (ligne.ordonnance.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette ligne n\'appartient pas à votre pharmacie.' },
        { status: 403 }
      )
    }

    // 4. Retourner les détails
    return NextResponse.json({
      id: ligne.id,
      ordonnanceId: ligne.ordonnanceId,
      medicamentId: ligne.medicamentId,
      dci: ligne.dci,
      posologie: ligne.posologie,
      quantite: ligne.quantite,
      delivree: ligne.delivree,
      ordonnance: ligne.ordonnance,
      createdAt: ligne.createdAt,
    })

  } catch (error) {
    console.error('Erreur récupération ligne ordonnance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la ligne d\'ordonnance' },
      { status: 500 }
    )
  }
}

/**
 * PATCH — Mettre à jour une ligne d'ordonnance (quantité délivrée, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M06_ORDONNANCES', 'write')
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

    const { quantite, delivree, posologie } = body as {
      quantite?: number
      delivree?: boolean
      posologie?: string
    }

    // 3. Récupérer la ligne
    const ligne = await db.ligneOrdonnance.findUnique({
      where: { id },
      include: {
        ordonnance: {
          select: {
            id: true,
            pharmacieId: true,
            statut: true,
          },
        },
      },
    })

    if (!ligne) {
      return NextResponse.json(
        { error: 'Ligne d\'ordonnance non trouvée' },
        { status: 404 }
      )
    }

    // 4. Vérifier l'accès à la pharmacie
    if (ligne.ordonnance.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette ligne n\'appartient pas à votre pharmacie.' },
        { status: 403 }
      )
    }

    // 5. Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {}
    if (quantite !== undefined) updateData.quantite = quantite
    if (delivree !== undefined) updateData.delivree = delivree
    if (posologie !== undefined) updateData.posologie = posologie

    // 6. Mettre à jour la ligne
    const updatedLigne = await db.ligneOrdonnance.update({
      where: { id },
      data: updateData,
    })

    // 7. Si la ligne est marquée comme délivrée, vérifier si toutes les lignes le sont
    if (delivree === true) {
      const allLignes = await db.ligneOrdonnance.findMany({
        where: { ordonnanceId: ligne.ordonnanceId },
        select: { delivree: true },
      })

      const allDelivrees = allLignes.every((l) => l.delivree)
      const someDelivrees = allLignes.some((l) => l.delivree)

      if (allDelivrees) {
        await db.ordonnance.update({
          where: { id: ligne.ordonnanceId },
          data: { statut: 'DELIVREE' },
        })
      } else if (someDelivrees) {
        await db.ordonnance.update({
          where: { id: ligne.ordonnanceId },
          data: { statut: 'PARTIELLEMENT_DELIVREE' },
        })
      }
    }

    // 8. Journaliser
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LIGNE_ORDONNANCE_MODIFIEE',
        entity: 'LigneOrdonnance',
        entityId: id,
        details: JSON.stringify({
          ordonnanceId: ligne.ordonnanceId,
          modifications: updateData,
          pharmacieId: user.pharmacieId,
        }),
      },
    })

    return NextResponse.json({
      message: 'Ligne d\'ordonnance mise à jour avec succès',
      ligne: updatedLigne,
    }, { status: 200 })

  } catch (error) {
    console.error('Erreur mise à jour ligne ordonnance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la ligne d\'ordonnance' },
      { status: 500 }
    )
  }
}
