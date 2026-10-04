import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: DPMED_ADMIN or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params

    const alerte = await db.alerteDPMED.findUnique({
      where: { id },
      include: {
        diffusions: {
          include: {
            pharmacie: {
              select: {
                id: true,
                nom: true,
                ville: true,
                telephone: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!alerte) {
      return NextResponse.json(
        { error: 'Alerte non trouvée' },
        { status: 404 }
      )
    }

    // Transform diffusions to match DiffusionTracker component expectations
    const diffusions = alerte.diffusions.map(d => ({
      id: d.id,
      alerteId: d.alerteId,
      pharmacieId: d.pharmacieId,
      lotsConcernes: [] as string[],
      canalEnvoi: ['PUSH', 'SMS'] as string[],
      dateEnvoi: d.createdAt.toISOString(),
      dateAcquittement: d.dateAcquittement?.toISOString() || null,
      actionPrise: d.commentaire || null,
      pharmacie: d.pharmacie,
    }))

    return NextResponse.json({
      ...alerte,
      diffusions,
    })
  } catch (error) {
    console.error('Erreur alerte DPMED:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement de l\'alerte' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: DPMED_ADMIN or PLATFORM_ADMIN required for writing
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'write')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.alerteDPMED.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Alerte non trouvée' },
        { status: 404 }
      )
    }

    const alerte = await db.alerteDPMED.update({
      where: { id },
      data: {
        ...(body.statut !== undefined && { statut: body.statut }),
        ...(body.titre !== undefined && { titre: body.titre }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.niveauUrgence !== undefined && { niveauUrgence: body.niveauUrgence }),
      },
    })

    return NextResponse.json(alerte)
  } catch (error) {
    console.error('Erreur mise à jour alerte:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}
