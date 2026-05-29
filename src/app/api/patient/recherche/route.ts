import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const isSuggestions = searchParams.get('suggestions') === 'true'
    const categorie = searchParams.get('categorie')
    const prixMin = searchParams.get('prixMin')
    const prixMax = searchParams.get('prixMax')
    const remboursable = searchParams.get('remboursable') === 'true'
    const generique = searchParams.get('generique') === 'true'

    if (q.length < 2) {
      return NextResponse.json([])
    }

    // Suggestions mode: return just names for autocomplete
    if (isSuggestions) {
      const suggestions = await db.medicament.findMany({
        where: {
          OR: [
            { nomCommercial: { contains: q, mode: 'insensitive' } },
            { dci: { contains: q, mode: 'insensitive' } },
            { codeCIP: { contains: q } },
            { codeEAN: { contains: q } },
          ],
          actif: true,
        },
        select: { nomCommercial: true, dci: true },
        distinct: ['nomCommercial'],
        take: 8,
      })
      return NextResponse.json({
        suggestions: [
          ...suggestions.map(s => s.nomCommercial),
          ...suggestions.map(s => s.dci),
        ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8),
      })
    }

    // Build filter
    const where: Record<string, unknown> = {
      actif: true,
      OR: [
        { nomCommercial: { contains: q, mode: 'insensitive' } },
        { dci: { contains: q, mode: 'insensitive' } },
        { codeCIP: { contains: q } },
        { codeEAN: { contains: q } },
      ],
    }

    if (remboursable) where.estRemboursable = true
    if (generique) where.estGenerique = true
    if (prixMin) where.prixVente = { ...((where.prixVente as object) || {}), gte: parseFloat(prixMin) }
    if (prixMax) where.prixVente = { ...((where.prixVente as object) || {}), lte: parseFloat(prixMax) }

    const medicaments = await db.medicament.findMany({
      where,
      include: {
        pharmacie: { select: { id: true, nom: true } },
        lots: { select: { quantite: true } },
        categorieATC: { select: { code: true, nom: true } },
      },
      take: limit,
    })

    const results = medicaments.map(med => ({
      id: med.id,
      nomCommercial: med.nomCommercial,
      dci: med.dci,
      dosage: med.dosage,
      forme: med.forme,
      prixVente: med.prixVente,
      estGenerique: med.estGenerique,
      estRemboursable: med.estRemboursable,
      pharmacieNom: med.pharmacie.nom,
      pharmacieId: med.pharmacie.id,
      stockDisponible: med.lots.reduce((sum, l) => sum + l.quantite, 0) > 0,
      categorieATC: med.categorieATC,
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error('Erreur GET recherche médicament:', error)
    return NextResponse.json({ error: 'Erreur lors de la recherche' }, { status: 500 })
  }
}
