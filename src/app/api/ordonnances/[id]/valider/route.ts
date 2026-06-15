// ============================================================
// MédiHelm — Validation rapide d'ordonnance
// POST /api/ordonnances/[id]/valider
// Flux simplifié de validation : passe directement à VALIDEE
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M06_ORDONNANCES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    // 2. Récupérer l'ordonnance
    const ordonnance = await db.ordonnance.findUnique({
      where: { id },
    })

    if (!ordonnance) {
      return NextResponse.json(
        { error: 'Ordonnance non trouvée' },
        { status: 404 }
      )
    }

    // 3. Vérifier l'accès à la pharmacie
    if (ordonnance.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette ordonnance n\'appartient pas à votre pharmacie.' },
        { status: 403 }
      )
    }

    // 4. Vérifier que l'ordonnance peut être validée
    const statutsValides = ['EN_VERIFICATION', 'RECUE']
    if (!statutsValides.includes(ordonnance.statut)) {
      return NextResponse.json(
        { error: `L'ordonnance ne peut pas être validée rapidement. Statut actuel : ${ordonnance.statut}` },
        { status: 400 }
      )
    }

    // 5. Valider directement l'ordonnance
    const updatedOrdonnance = await db.ordonnance.update({
      where: { id },
      data: {
        statut: 'VALIDEE',
        verifiePar: user.id,
        verifieLe: new Date(),
      },
    })

    // 6. Journaliser
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'ORDONNANCE_VALIDEE_RAPIDE',
        entity: 'Ordonnance',
        entityId: id,
        details: JSON.stringify({
          ancienStatut: ordonnance.statut,
          nouveauStatut: 'VALIDEE',
          pharmacieId: user.pharmacieId,
          validateur: `${user.prenom} ${user.nom}`,
        }),
      },
    })

    return NextResponse.json({
      message: 'Ordonnance validée avec succès',
      ordonnance: updatedOrdonnance,
    }, { status: 200 })

  } catch (error) {
    console.error('Erreur validation rapide ordonnance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la validation rapide de l\'ordonnance' },
      { status: 500 }
    )
  }
}
