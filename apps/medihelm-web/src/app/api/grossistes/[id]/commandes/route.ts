import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/grossistes/[id]/commandes
 * List CommandeGrossiste for a given grossiste with status filter and pagination.
 * Query: ?statut=ENVOYEE&page=1&limit=20
 * Requires: M17_GROSSISTES read
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { grossisteId: id }
    if (statut) where.statut = statut

    const [commandes, total] = await Promise.all([
      db.commandeGrossiste.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          grossiste: {
            select: { id: true, nom: true, slug: true },
          },
          lignes: true,
        },
      }),
      db.commandeGrossiste.count({ where }),
    ])

    // Fetch pharmacie data separately (no direct Prisma relation)
    const pharmacieIds = commandes
      .map(c => c.pharmacieId)
      .filter(Boolean) as string[]
    const pharmacies =
      pharmacieIds.length > 0
        ? await db.pharmacie.findMany({
            where: { id: { in: pharmacieIds } },
            select: {
              id: true,
              nom: true,
              ville: true,
              adresse: true,
              telephone: true,
            },
          })
        : []
    const pharmacieMap = new Map(pharmacies.map(p => [p.id, p]))

    // Map commandes to match frontend expected format
    const mappedCommandes = commandes.map(c => ({
      ...c,
      referenceGrossiste: c.reference,
      dateEnvoi: c.createdAt,
      dateConfirmation: null,
      dateLivraisonPrev: null,
      dateLivraisonReelle: null,
      montantTotal: c.montantTotal || 0,
      payload: {},
      reponseGrossiste: null,
      pharmacie: c.pharmacieId
        ? pharmacieMap.get(c.pharmacieId) || null
        : null,
    }))

    return NextResponse.json({
      commandes: mappedCommandes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur commandes grossiste:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des commandes' },
      { status: 500 }
    )
  }
}
