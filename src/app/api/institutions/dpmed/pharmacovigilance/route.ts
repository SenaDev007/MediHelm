import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: DPMED_ADMIN or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const gravite = searchParams.get('gravite')
    const statut = searchParams.get('statut')

    // EI Signalements
    const whereSignalement: Record<string, unknown> = {}
    if (gravite) whereSignalement.gravite = gravite
    if (statut) whereSignalement.statutEnvoi = statut

    const signalements = await db.signalementEI.findMany({
      where: whereSignalement,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        pharmacie: {
          select: {
            id: true,
            nom: true,
            ville: true,
          },
        },
      },
    })

    // Signalements by gravite
    const signalementsParGravite = await db.signalementEI.groupBy({
      by: ['gravite'],
      _count: { id: true },
    })

    // Signalements by statut
    const signalementsParStatut = await db.signalementEI.groupBy({
      by: ['statutEnvoi'],
      _count: { id: true },
    })

    // Drug surveillance data
    const surveillances = await db.medicamentSurveillance.findMany({
      where: { statut: 'ACTIVE' },
      take: 50,
      orderBy: { dateEmission: 'desc' },
    })

    // Surveillance by type
    const surveillanceParType = await db.medicamentSurveillance.groupBy({
      by: ['typeSurveillance'],
      where: { statut: 'ACTIVE' },
      _count: { id: true },
    })

    // Surveillance by risk level
    const surveillanceParRisque = await db.medicamentSurveillance.groupBy({
      by: ['niveauRisque'],
      where: { statut: 'ACTIVE' },
      _count: { id: true },
    })

    // Total counts for accurate stats
    const totalSignalements = await db.signalementEI.count()
    const totalSurveillances = await db.medicamentSurveillance.count({ where: { statut: 'ACTIVE' } })

    return NextResponse.json({
      signalements,
      surveillances,
      stats: {
        totalSignalements,
        signalementsParGravite: signalementsParGravite.map(s => ({
          gravite: s.gravite,
          count: s._count.id,
        })),
        signalementsParStatut: signalementsParStatut.map(s => ({
          statut: s.statutEnvoi,
          count: s._count.id,
        })),
        totalSurveillances,
        surveillanceParType: surveillanceParType.map(s => ({
          type: s.typeSurveillance,
          count: s._count.id,
        })),
        surveillanceParRisque: surveillanceParRisque.map(s => ({
          risque: s.niveauRisque,
          count: s._count.id,
        })),
      },
    })
  } catch (error) {
    console.error('Erreur pharmacovigilance:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des données de pharmacovigilance' },
      { status: 500 }
    )
  }
}
