// ============================================================
// MédiHelm — Acquittement d'une alerte DPMED
// POST /api/alertes/dpmed/[id]/acquitter
// Met à jour la diffusion vers ACQUITTEE et la date d'acquittement
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
    const authResult = await requireAuth(request, 'M18_ALERTES_DPMED', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    // 2. Vérifier que l'alerte existe
    const alerte = await db.alerteDPMED.findUnique({
      where: { id },
    })

    if (!alerte) {
      return NextResponse.json(
        { error: 'Alerte DPMED non trouvée' },
        { status: 404 }
      )
    }

    // 3. Trouver la diffusion de la pharmacie de l'utilisateur
    const diffusion = await db.diffusionAlerte.findFirst({
      where: {
        alerteId: id,
        pharmacieId: user.pharmacieId,
      },
    })

    if (!diffusion) {
      return NextResponse.json(
        { error: 'Aucune diffusion trouvée pour votre pharmacie concernant cette alerte' },
        { status: 404 }
      )
    }

    // 4. Vérifier si déjà acquittée
    if (diffusion.statut === 'ACQUITTEE') {
      return NextResponse.json(
        { message: 'Alerte déjà acquittée', diffusionId: diffusion.id },
        { status: 200 }
      )
    }

    // 5. Acquitter la diffusion
    const updatedDiffusion = await db.diffusionAlerte.update({
      where: { id: diffusion.id },
      data: {
        statut: 'ACQUITTEE',
        dateAcquittement: new Date(),
      },
    })

    // 6. Vérifier si toutes les pharmacies ont acquitté → mettre à jour le statut de l'alerte
    const pendingDiffusions = await db.diffusionAlerte.count({
      where: {
        alerteId: id,
        statut: { in: ['EN_ATTENTE', 'RECUE'] },
      },
    })

    if (pendingDiffusions === 0) {
      await db.alerteDPMED.update({
        where: { id },
        data: { statut: 'ACQUITTEE' },
      })
    }

    // 7. Journaliser l'action
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'ACQUITTER_ALERTE_DPMED',
        entity: 'DiffusionAlerte',
        entityId: diffusion.id,
        details: JSON.stringify({
          alerteId: id,
          pharmacieId: user.pharmacieId,
          ancienStatut: diffusion.statut,
          nouveauStatut: 'ACQUITTEE',
        }),
      },
    })

    return NextResponse.json({
      message: 'Alerte acquittée avec succès',
      diffusion: updatedDiffusion,
    }, { status: 200 })

  } catch (error) {
    console.error('Erreur acquittement alerte DPMED:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'acquittement de l\'alerte' },
      { status: 500 }
    )
  }
}
