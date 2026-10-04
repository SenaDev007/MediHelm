import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/qualite/signalements/[id] — Détail d'un signalement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { id } = await params

    const signalement = await db.signalementEI.findFirst({
      where: {
        id,
        pharmacieId: user.pharmacieId,
      },
    })

    if (!signalement) {
      return NextResponse.json(
        { error: 'Signalement introuvable.' },
        { status: 404 }
      )
    }

    // Vérifier s'il y a des surveillances actives pour cette DCI
    const surveillances = await db.medicamentSurveillance.findMany({
      where: {
        dci: { equals: signalement.dciConcernee, mode: 'insensitive' },
        statut: 'ACTIVE',
      },
    })

    return NextResponse.json({
      ...signalement,
      surveillancesActives: surveillances,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du signalement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du signalement.' },
      { status: 500 }
    )
  }
}

// PATCH /api/qualite/signalements/[id] — Mettre à jour un signalement (transition de statut)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'write')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { id } = await params
    const body = await request.json()

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

    // Transitions de statut autorisées
    const validTransitions: Record<string, string[]> = {
      'EN_ATTENTE': ['SOUMIS', 'CLOTURE'],
      'SOUMIS': ['ACQUITTE', 'CLOTURE'],
      'ACQUITTE': ['CLOTURE'],
      'CLOTURE': [],
    }

    const newStatut = body.statutEnvoi
    if (newStatut) {
      const allowedTransitions = validTransitions[signalement.statutEnvoi]
      if (!allowedTransitions || !allowedTransitions.includes(newStatut)) {
        return NextResponse.json(
          {
            error: `Transition de statut invalide: ${signalement.statutEnvoi} → ${newStatut}. Transitions autorisées: ${allowedTransitions.join(', ') || 'aucune'}`,
          },
          { status: 400 }
        )
      }
    }

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {}
    if (newStatut) updateData.statutEnvoi = newStatut
    if (body.descriptionEI) updateData.descriptionEI = body.descriptionEI
    if (body.gravite) {
      const validGravites = ['MINEUR', 'MODERE', 'GRAVE', 'VITAL']
      if (!validGravites.includes(body.gravite)) {
        return NextResponse.json(
          { error: `Gravité invalide. Valeurs autorisées: ${validGravites.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.gravite = body.gravite
    }
    if (body.refDPMED) updateData.refDPMED = body.refDPMED

    const updated = await db.signalementEI.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du signalement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du signalement.' },
      { status: 500 }
    )
  }
}
