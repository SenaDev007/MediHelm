import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/qualite/surveillance/[id] — Détail d'une entrée de surveillance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
    if (authResult instanceof Response) return authResult

    const { id } = await params

    const surveillance = await db.medicamentSurveillance.findUnique({
      where: { id },
    })

    if (!surveillance) {
      return NextResponse.json(
        { error: 'Entrée de surveillance introuvable.' },
        { status: 404 }
      )
    }

    // Vérifier les alertes DPMED liées à cette DCI
    const alertesDPMED = await db.alerteDPMED.findMany({
      where: {
        dciConcernee: { equals: surveillance.dci, mode: 'insensitive' },
        statut: 'EN_DIFFUSION',
      },
      orderBy: { dateEmissionDPMED: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      ...surveillance,
      alertesDPMED,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de la surveillance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'entrée de surveillance.' },
      { status: 500 }
    )
  }
}

// PATCH /api/qualite/surveillance/[id] — Mettre à jour une entrée de surveillance
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'write')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { id } = await params

    const surveillance = await db.medicamentSurveillance.findUnique({
      where: { id },
    })

    if (!surveillance) {
      return NextResponse.json(
        { error: 'Entrée de surveillance introuvable.' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Seuls DPMED_ADMIN et admins peuvent modifier les surveillances
    if (user.roleName !== 'DPMED_ADMIN' && user.roleName !== 'ADMIN' && user.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs DPMED et les administrateurs peuvent modifier les entrées de surveillance.' },
        { status: 403 }
      )
    }

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {}

    if (body.description !== undefined) updateData.description = body.description
    if (body.niveauRisque) {
      const validNiveaux = ['FAIBLE', 'MODERE', 'ELEVE', 'CRITIQUE']
      if (!validNiveaux.includes(body.niveauRisque)) {
        return NextResponse.json(
          { error: `Niveau de risque invalide. Valeurs autorisées: ${validNiveaux.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.niveauRisque = body.niveauRisque
    }
    if (body.typeSurveillance) {
      const validTypes = ['SOUS_SURVEILLANCE', 'RAPPEL_LOT', 'CONTREFACON', 'AMM_SUSPENDUE', 'INTERDICTION']
      if (!validTypes.includes(body.typeSurveillance)) {
        return NextResponse.json(
          { error: `Type de surveillance invalide. Valeurs autorisées: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.typeSurveillance = body.typeSurveillance
    }
    if (body.statut !== undefined) {
      updateData.statut = body.statut
    }
    if (body.sourceAlerte !== undefined) updateData.sourceAlerte = body.sourceAlerte
    if (body.nomCommercial !== undefined) updateData.nomCommercial = body.nomCommercial

    const updated = await db.medicamentSurveillance.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la surveillance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'entrée de surveillance.' },
      { status: 500 }
    )
  }
}

// DELETE /api/qualite/surveillance/[id] — Désactiver une entrée de surveillance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'delete')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { id } = await params

    const surveillance = await db.medicamentSurveillance.findUnique({
      where: { id },
    })

    if (!surveillance) {
      return NextResponse.json(
        { error: 'Entrée de surveillance introuvable.' },
        { status: 404 }
      )
    }

    // Seuls DPMED_ADMIN et admins peuvent désactiver les surveillances
    if (user.roleName !== 'DPMED_ADMIN' && user.roleName !== 'ADMIN' && user.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs DPMED et les administrateurs peuvent désactiver les entrées de surveillance.' },
        { status: 403 }
      )
    }

    // Désactiver au lieu de supprimer (soft delete)
    const updated = await db.medicamentSurveillance.update({
      where: { id },
      data: { statut: 'DESACTIVEE' },
    })

    return NextResponse.json({
      message: 'Entrée de surveillance désactivée avec succès.',
      surveillance: updated,
    })
  } catch (error) {
    console.error('Erreur lors de la désactivation de la surveillance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la désactivation de l\'entrée de surveillance.' },
      { status: 500 }
    )
  }
}
