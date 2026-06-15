// ============================================================
// MédiHelm — Enregistrement d'une action sur une alerte DPMED
// POST /api/alertes/dpmed/[id]/action
// Met à jour la diffusion avec actionPrise et commentaire
// Crée une entrée AuditLog pour traçabilité
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

    const { actionPrise, commentaire } = body as {
      actionPrise?: string
      commentaire?: string
    }

    // 3. Valider les champs obligatoires
    if (!actionPrise) {
      return NextResponse.json(
        { error: 'Le champ actionPrise est obligatoire' },
        { status: 400 }
      )
    }

    // 4. Vérifier que l'alerte existe
    const alerte = await db.alerteDPMED.findUnique({
      where: { id },
    })

    if (!alerte) {
      return NextResponse.json(
        { error: 'Alerte DPMED non trouvée' },
        { status: 404 }
      )
    }

    // 5. Trouver la diffusion de la pharmacie de l'utilisateur
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

    // 6. Mettre à jour la diffusion avec l'action et le commentaire
    const updatedDiffusion = await db.diffusionAlerte.update({
      where: { id: diffusion.id },
      data: {
        commentaire: `${actionPrise}${commentaire ? ' — ' + commentaire : ''}`,
        statut: diffusion.statut === 'EN_ATTENTE' ? 'RECUE' : diffusion.statut,
      },
    })

    // 7. Créer une entrée AuditLog pour la traçabilité
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'ACTION_ALERTE_DPMED',
        entity: 'DiffusionAlerte',
        entityId: diffusion.id,
        details: JSON.stringify({
          alerteId: id,
          pharmacieId: user.pharmacieId,
          actionPrise,
          commentaire: commentaire || null,
          alerteTitre: alerte.titre,
          alerteType: alerte.typeAlerte,
        }),
      },
    })

    return NextResponse.json({
      message: 'Action enregistrée avec succès',
      diffusion: updatedDiffusion,
    }, { status: 200 })

  } catch (error) {
    console.error('Erreur enregistrement action alerte DPMED:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de l\'action' },
      { status: 500 }
    )
  }
}
