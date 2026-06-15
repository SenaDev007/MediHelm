import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// POST /api/qualite/signalements/[id]/soumettre — Soumettre un signalement au DPMED
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'write')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { id } = await params

    // Vérifier que le signalement existe et appartient à la pharmacie
    const signalement = await db.signalementEI.findFirst({
      where: { id, pharmacieId: user.pharmacieId },
    })

    if (!signalement) {
      return NextResponse.json(
        { error: 'Signalement introuvable.' },
        { status: 404 }
      )
    }

    // Vérifier que le signalement est en attente
    if (signalement.statutEnvoi !== 'EN_ATTENTE') {
      return NextResponse.json(
        { error: `Ce signalement ne peut pas être soumis. Statut actuel: ${signalement.statutEnvoi}. Seuls les signalements en attente (EN_ATTENTE) peuvent être soumis.` },
        { status: 400 }
      )
    }

    // Générer une référence DPMED
    const refDPMED = `DPMED-EI-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // Mettre à jour le signalement
    const updated = await db.signalementEI.update({
      where: { id },
      data: {
        statutEnvoi: 'SOUMIS',
        refDPMED,
      },
    })

    // Enregistrer dans l'audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'SOUMISSION_SIGNALEMENT_EI',
        entity: 'SignalementEI',
        entityId: id,
        details: JSON.stringify({
          dciConcernee: signalement.dciConcernee,
          gravite: signalement.gravite,
          refDPMED,
          pharmacieId: user.pharmacieId,
        }),
      },
    })

    return NextResponse.json({
      message: 'Signalement soumis avec succès au DPMED.',
      signalement: updated,
      refDPMED,
      dateSoumission: updated.updatedAt,
    })
  } catch (error) {
    console.error('Erreur lors de la soumission du signalement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la soumission du signalement au DPMED.' },
      { status: 500 }
    )
  }
}
