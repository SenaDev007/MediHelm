import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/grossistes/[id]/catalogue
 * List ProduitGrossiste for a given grossiste with search/filter/pagination.
 * Query: ?actif=true|false&dci=xxx&search=xxx&page=1&limit=50
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
    const actif = searchParams.get('actif')
    const dci = searchParams.get('dci')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { grossisteId: id }
    if (actif === 'true') where.actif = true
    else if (actif === 'false') where.actif = false
    if (dci) where.dci = { contains: dci, mode: 'insensitive' }
    if (search) {
      where.OR = [
        { dci: { contains: search, mode: 'insensitive' } },
        { nomCommercial: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [catalogue, total] = await Promise.all([
      db.produitGrossiste.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dci: 'asc' },
      }),
      db.produitGrossiste.count({ where }),
    ])

    return NextResponse.json({
      produits: catalogue,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur catalogue grossiste:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du catalogue' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/grossistes/[id]/catalogue
 * Add a new product to a grossiste's catalogue.
 * Requires: M17_GROSSISTES write
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params
    const body = await request.json()
    const { dci, nomCommercial, forme, dosage, prixUnitaire, quantiteDispo } =
      body

    if (!dci || !nomCommercial || !prixUnitaire) {
      return NextResponse.json(
        { error: 'dci, nomCommercial et prixUnitaire sont requis' },
        { status: 400 }
      )
    }

    // Verify grossiste exists
    const grossiste = await db.grossiste.findUnique({ where: { id } })
    if (!grossiste) {
      return NextResponse.json(
        { error: 'Grossiste non trouvé' },
        { status: 404 }
      )
    }

    // Validate prixUnitaire
    if (typeof prixUnitaire !== 'number' || prixUnitaire < 0) {
      return NextResponse.json(
        { error: 'Le prix unitaire doit être un nombre positif' },
        { status: 400 }
      )
    }

    const produit = await db.produitGrossiste.create({
      data: {
        grossisteId: id,
        dci,
        nomCommercial,
        forme: forme || 'COMPRIME',
        dosage: dosage || '',
        prixUnitaire,
        quantiteDispo:
          quantiteDispo !== undefined
            ? typeof quantiteDispo === 'string'
              ? parseInt(quantiteDispo)
              : quantiteDispo
            : null,
      },
    })

    return NextResponse.json(produit, { status: 201 })
  } catch (error) {
    console.error('Erreur création produit catalogue:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du produit au catalogue" },
      { status: 500 }
    )
  }
}
