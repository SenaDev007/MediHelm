import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/grossistes/compare
 * Compare prices across grossistes by DCI or medicament name.
 * Query: ?dci=Paracetamol&medicamentNom=Doliprane
 * Requires: M17_GROSSISTES read
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const dci = searchParams.get('dci')
    const medicamentNom = searchParams.get('medicamentNom')

    // Build catalogue filter
    const catalogueWhere: Record<string, unknown> = {}
    if (dci) {
      catalogueWhere.dci = { contains: dci, mode: 'insensitive' }
    }
    if (medicamentNom) {
      catalogueWhere.OR = [
        { nomCommercial: { contains: medicamentNom, mode: 'insensitive' } },
        { dci: { contains: medicamentNom, mode: 'insensitive' } },
      ]
    }

    // Cross-grossiste comparison
    const grossistes = await db.grossiste.findMany({
      where: { actif: true },
      include: {
        catalogue: {
          where:
            Object.keys(catalogueWhere).length > 0
              ? catalogueWhere
              : undefined,
          select: {
            id: true,
            dci: true,
            nomCommercial: true,
            forme: true,
            dosage: true,
            prixUnitaire: true,
            quantiteDispo: true,
            actif: true,
          },
        },
        _count: {
          select: { commandes: true },
        },
      },
    })

    const comparison = grossistes.map(g => ({
      id: g.id,
      nom: g.nom,
      slug: g.slug,
      totalProduits: g.catalogue.length,
      produitsDisponibles: g.catalogue.filter(
        p => p.actif && (p.quantiteDispo === null || p.quantiteDispo > 0)
      ).length,
      totalCommandes: g._count.commandes,
      catalogue: g.catalogue,
      prixMoyen:
        g.catalogue.length > 0
          ? Math.round(
              g.catalogue.reduce((acc, p) => acc + p.prixUnitaire, 0) /
                g.catalogue.length
            )
          : 0,
    }))

    // If searching by dci or medicamentNom, compute best price
    if (dci || medicamentNom) {
      const allMatchingProducts = comparison.flatMap(g =>
        g.catalogue.map(p => ({
          grossisteId: g.id,
          grossisteNom: g.nom,
          ...p,
        }))
      )
      const bestPrice = allMatchingProducts
        .filter(
          p => p.actif && (p.quantiteDispo === null || p.quantiteDispo > 0)
        )
        .sort((a, b) => a.prixUnitaire - b.prixUnitaire)

      return NextResponse.json({
        comparison,
        bestPrice: bestPrice.length > 0 ? bestPrice[0] : null,
        matchingProducts: allMatchingProducts,
      })
    }

    return NextResponse.json(comparison)
  } catch (error) {
    console.error('Erreur comparaison grossistes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la comparaison' },
      { status: 500 }
    )
  }
}
