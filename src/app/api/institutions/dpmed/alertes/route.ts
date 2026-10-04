import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: DPMED_ADMIN, SOBAPS_VIEWER, ABRP_VIEWER or PLATFORM_ADMIN
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const urgence = searchParams.get('urgence')
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (type) where.typeAlerte = type
    if (urgence) where.niveauUrgence = urgence
    if (statut) where.statut = statut

    const [alertes, total] = await Promise.all([
      db.alerteDPMED.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          diffusions: {
            select: {
              id: true,
              statut: true,
              pharmacieId: true,
              dateAcquittement: true,
              pharmacie: {
                select: { id: true, nom: true, ville: true },
              },
            },
          },
        },
      }),
      db.alerteDPMED.count({ where }),
    ])

    // Stats summary
    const totalAlertes = await db.alerteDPMED.count()
    const enCours = await db.alerteDPMED.count({ where: { statut: 'EN_DIFFUSION' } })
    const acquitees = await db.alerteDPMED.count({ where: { statut: 'ACQUITTEE' } })

    return NextResponse.json({
      alertes,
      stats: {
        total: totalAlertes,
        enCours,
        acquitees,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur listage alertes institution:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des alertes' },
      { status: 500 }
    )
  }
}
