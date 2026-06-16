import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/grossistes/catalogue
 * General catalogue search across all grossistes.
 * Query: ?grossisteId=xxx&actif=true&dci=Paracetamol
 * Requires: M17_GROSSISTES read
 */
export async function GET(request: Request) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.SEARCH)
  if (rateLimitResult) return rateLimitResult

  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const grossisteId = searchParams.get('grossisteId')
    const actif = searchParams.get('actif')
    const dci = searchParams.get('dci')

    const where: Record<string, unknown> = {}
    if (grossisteId) where.grossisteId = grossisteId
    if (actif === 'true') where.actif = true
    else if (actif === 'false') where.actif = false
    if (dci) where.dci = { contains: dci, mode: 'insensitive' }

    const produits = await db.produitGrossiste.findMany({
      where,
      orderBy: { dci: 'asc' },
    })

    return NextResponse.json(produits)
  } catch (error) {
    console.error('Erreur catalogue:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du catalogue' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/grossistes/catalogue
 * Create a new product in the catalogue (general endpoint).
 * Body: { grossisteId, dci, nomCommercial, forme, dosage, prixUnitaire, quantiteDispo }
 * Requires: M17_GROSSISTES write
 */
export async function POST(request: Request) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  try {
    const body = await request.json()
    const { grossisteId, dci, nomCommercial, forme, dosage, prixUnitaire, quantiteDispo } = body

    if (!grossisteId || !dci || !nomCommercial || !prixUnitaire) {
      return NextResponse.json(
        { error: 'grossisteId, dci, nomCommercial et prixUnitaire sont requis' },
        { status: 400 }
      )
    }

    // Verify grossiste exists
    const grossiste = await db.grossiste.findUnique({ where: { id: grossisteId } })
    if (!grossiste) {
      return NextResponse.json(
        { error: 'Grossiste non trouvé' },
        { status: 404 }
      )
    }

    const produit = await db.produitGrossiste.create({
      data: {
        grossisteId,
        dci,
        nomCommercial,
        forme: forme || 'COMPRIME',
        dosage: dosage || '',
        prixUnitaire: parseFloat(String(prixUnitaire)),
        quantiteDispo: quantiteDispo ? parseInt(String(quantiteDispo)) : null,
      },
    })

    return NextResponse.json(produit, { status: 201 })
  } catch (error) {
    console.error('Erreur création produit:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du produit' },
      { status: 500 }
    )
  }
}
