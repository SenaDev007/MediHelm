import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const ATC_CODES = new Set(['A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'V'])

export async function GET(request: NextRequest) {
  const rateLimitResponse = rateLimit(request, RATE_LIMITS.SEARCH)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().slice(0, 100)
    if (q.length < 2) return NextResponse.json({ error: 'La recherche doit contenir au moins 2 caractères' }, { status: 400 })

    const suggestionsOnly = searchParams.get('suggestions') === 'true'
    const categorie = searchParams.get('categorie') || ''
    if (categorie && !ATC_CODES.has(categorie)) {
      return NextResponse.json({ error: 'Catégorie ATC invalide' }, { status: 400 })
    }

    const parseOptionalNumber = (key: string) => {
      const raw = searchParams.get(key)
      if (raw === null || raw === '') return undefined
      const value = Number(raw)
      return Number.isFinite(value) && value >= 0 ? value : undefined
    }
    const prixMin = parseOptionalNumber('prixMin')
    const prixMax = parseOptionalNumber('prixMax')
    const page = Math.max(1, Math.floor(Number(searchParams.get('page') || '1') || 1))
    const limit = Math.min(50, Math.max(1, Math.floor(Number(searchParams.get('limit') || '20') || 20)))

    const where: Record<string, unknown> = {
      actif: true,
      pharmacie: { actif: true },
      OR: [
        { nomCommercial: { contains: q, mode: 'insensitive' } },
        { dci: { contains: q, mode: 'insensitive' } },
        { dosage: { contains: q, mode: 'insensitive' } },
      ],
    }
    if (categorie) where.categorieAtc = categorie
    if (prixMin !== undefined || prixMax !== undefined) {
      where.prixPublic = {
        ...(prixMin !== undefined ? { gte: prixMin } : {}),
        ...(prixMax !== undefined ? { lte: prixMax } : {}),
      }
    }
    if (searchParams.get('remboursable') === 'true') where.remboursable = true
    if (searchParams.get('generique') === 'true') where.generique = true

    if (suggestionsOnly) {
      const candidates = await db.medicament.findMany({
        where,
        select: { nomCommercial: true, dci: true },
        orderBy: { nomCommercial: 'asc' },
        take: 20,
      })
      const suggestions = Array.from(new Set(candidates.flatMap(item => [item.nomCommercial, item.dci])))
        .filter(value => value.toLowerCase().includes(q.toLowerCase()))
        .slice(0, Math.min(limit, 10))
      return NextResponse.json({ suggestions })
    }

    const now = new Date()
    const [medicaments, total] = await Promise.all([
      db.medicament.findMany({
        where,
        select: {
          id: true,
          nomCommercial: true,
          dci: true,
          dosage: true,
          forme: true,
          prixPublic: true,
          categorieAtc: true,
          remboursable: true,
          generique: true,
          stockSecurite: true,
          pharmacie: { select: { id: true, nom: true } },
          lots: {
            where: { quantite: { gt: 0 }, dateExpiration: { gt: now } },
            select: { quantite: true },
          },
        },
        orderBy: [{ nomCommercial: 'asc' }, { prixPublic: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.medicament.count({ where }),
    ])

    const data = medicaments.map(med => {
      const totalStock = med.lots.reduce((sum, lot) => sum + lot.quantite, 0)
      return {
        id: med.id,
        nomCommercial: med.nomCommercial,
        dci: med.dci,
        dosage: med.dosage,
        forme: med.forme,
        prixVente: med.prixPublic,
        estGenerique: med.generique,
        estRemboursable: med.remboursable,
        generique: med.generique,
        remboursable: med.remboursable,
        pharmacieId: med.pharmacie.id,
        pharmacieNom: med.pharmacie.nom,
        stockDisponible: totalStock > 0,
        categorieATC: med.categorieAtc ? { code: med.categorieAtc, nom: med.categorieAtc } : null,
      }
    })

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch {
    console.error('Erreur GET patient/recherche')
    return NextResponse.json({ error: 'Erreur lors de la recherche de médicaments' }, { status: 500 })
  }
}
