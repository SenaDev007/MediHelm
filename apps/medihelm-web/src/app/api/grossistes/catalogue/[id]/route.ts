import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/grossistes/catalogue/[id]
 * Get a single ProduitGrossiste by ID.
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
    const produit = await db.produitGrossiste.findUnique({
      where: { id },
      include: {
        grossiste: {
          select: { id: true, nom: true, slug: true },
        },
      },
    })

    if (!produit) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(produit)
  } catch (error) {
    console.error('Erreur produit:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du produit' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/grossistes/catalogue/[id]
 * Update price/stock/availability of a ProduitGrossiste.
 * Requires: M17_GROSSISTES write
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params
    const body = await request.json()
    const { dci, nomCommercial, forme, dosage, prixUnitaire, quantiteDispo, actif } =
      body

    const existing = await db.produitGrossiste.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    // Validate prixUnitaire if provided
    if (
      prixUnitaire !== undefined &&
      (typeof prixUnitaire !== 'number' || prixUnitaire < 0)
    ) {
      return NextResponse.json(
        { error: 'Le prix unitaire doit être un nombre positif' },
        { status: 400 }
      )
    }

    const produit = await db.produitGrossiste.update({
      where: { id },
      data: {
        ...(dci !== undefined && { dci }),
        ...(nomCommercial !== undefined && { nomCommercial }),
        ...(forme !== undefined && { forme }),
        ...(dosage !== undefined && { dosage }),
        ...(prixUnitaire !== undefined && { prixUnitaire }),
        ...(quantiteDispo !== undefined && { quantiteDispo }),
        ...(actif !== undefined && { actif }),
      },
    })

    return NextResponse.json(produit)
  } catch (error) {
    console.error('Erreur mise à jour produit:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du produit' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/grossistes/catalogue/[id]
 * Delete a ProduitGrossiste.
 * Requires: M17_GROSSISTES write
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params

    const existing = await db.produitGrossiste.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    await db.produitGrossiste.delete({ where: { id } })

    return NextResponse.json({ message: 'Produit supprimé' })
  } catch (error) {
    console.error('Erreur suppression produit:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du produit' },
      { status: 500 }
    )
  }
}
