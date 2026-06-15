import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const categorie = searchParams.get('categorie') || ''
    const prixMin = searchParams.get('prixMin') ? parseFloat(searchParams.get('prixMin')!) : undefined
    const prixMax = searchParams.get('prixMax') ? parseFloat(searchParams.get('prixMax')!) : undefined
    const remboursable = searchParams.get('remboursable')
    const generique = searchParams.get('generique')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Build where clause — no pharmacieId filter (patients search ALL pharmacies)
    const where: Record<string, unknown> = {
      actif: true,
    }

    // Search across multiple fields if q is provided
    // Note: forme is an enum in Prisma but stored as string in PostgreSQL,
    // so contains filter works at runtime even though the type is Record<string, unknown>
    if (q) {
      where.OR = [
        { nomCommercial: { contains: q, mode: 'insensitive' } },
        { dci: { contains: q, mode: 'insensitive' } },
        { dosage: { contains: q, mode: 'insensitive' } },
        { forme: { contains: q, mode: 'insensitive' } },
      ]
    }

    // ATC category filter
    if (categorie) {
      where.categorieAtc = categorie
    }

    // Price range filters
    if (prixMin !== undefined || prixMax !== undefined) {
      const prixFilter: Record<string, unknown> = {}
      if (prixMin !== undefined) prixFilter.gte = prixMin
      if (prixMax !== undefined) prixFilter.lte = prixMax
      where.prixPublic = prixFilter
    }

    // Boolean filters
    if (remboursable !== null && remboursable !== undefined && remboursable !== '') {
      where.remboursable = remboursable === 'true'
    }
    if (generique !== null && generique !== undefined && generique !== '') {
      where.generique = generique === 'true'
    }

    const [medicaments, total] = await Promise.all([
      db.medicament.findMany({
        where,
        include: {
          lots: {
            where: {
              quantite: { gt: 0 },
              dateExpiration: { gt: new Date() },
            },
            orderBy: { dateExpiration: 'asc' },
          },
        },
        orderBy: { nomCommercial: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.medicament.count({ where }),
    ])

    const now = new Date()
    const results = medicaments.map((med) => {
      const activeLots = med.lots.filter((lot) => lot.quantite > 0 && lot.dateExpiration > now)
      const totalStock = activeLots.reduce((sum, lot) => sum + lot.quantite, 0)
      const nearestExpiration = activeLots.length > 0 ? activeLots[0].dateExpiration : null

      let stockStatus: 'EN_STOCK' | 'STOCK_FAIBLE' | 'RUPTURE' = 'RUPTURE'
      if (totalStock > med.stockSecurite) {
        stockStatus = 'EN_STOCK'
      } else if (totalStock > 0) {
        stockStatus = 'STOCK_FAIBLE'
      }

      return {
        id: med.id,
        nomCommercial: med.nomCommercial,
        dci: med.dci,
        dosage: med.dosage,
        forme: med.forme,
        prixVente: med.prixPublic,
        categorieATC: med.categorieAtc,
        remboursable: med.remboursable,
        generique: med.generique,
        stockStatus,
        nombreLotsActifs: activeLots.length,
        dateExpirationProche: nearestExpiration,
      }
    })

    return NextResponse.json({
      data: results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET patient/recherche:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recherche de médicaments' },
      { status: 500 }
    )
  }
}
