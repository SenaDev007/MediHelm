import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'

// ATC Classification descriptions mapping (static config)
const ATC_CATEGORIES: Record<string, { code: string; description: string }> = {
  A: { code: 'A', description: 'Voies digestives et métabolisme' },
  B: { code: 'B', description: 'Sang et organes hématopoïétiques' },
  C: { code: 'C', description: 'Système cardiovasculaire' },
  D: { code: 'D', description: 'Dermatologiques' },
  G: { code: 'G', description: 'Système génito-urinaire et hormones sexuelles' },
  H: { code: 'H', description: 'Hormones systémiques, hors hormones sexuelles' },
  J: { code: 'J', description: 'Anti-infectieux systémiques' },
  L: { code: 'L', description: 'Antinéoplasiques et immunomodulateurs' },
  M: { code: 'M', description: 'Système musculo-squelettique' },
  N: { code: 'N', description: 'Système nerveux' },
  P: { code: 'P', description: 'Antiparasitaires, insecticides et répulsifs' },
  R: { code: 'R', description: 'Système respiratoire' },
  S: { code: 'S', description: 'Organes sensoriels' },
  V: { code: 'V', description: 'Divers' },
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Récupérer les compteurs réels de médicaments par catégorie ATC depuis la DB
    const medicationCounts = await db.medicament.groupBy({
      by: ['categorieAtc'],
      where: {
        pharmacieId: user.pharmacieId,
        actif: true,
      },
      _count: { id: true },
    })

    // Construire un map pour un accès rapide
    const countMap = new Map<string, number>()
    for (const item of medicationCounts) {
      if (item.categorieAtc) {
        countMap.set(item.categorieAtc, item._count.id)
      }
    }

    // Enrichir les catégories avec les compteurs réels
    let categories = Object.values(ATC_CATEGORIES).map((cat) => ({
      ...cat,
      nbMedicaments: countMap.get(cat.code) || 0,
    }))

    if (search) {
      categories = categories.filter(
        (cat) =>
          cat.code.toLowerCase().includes(search.toLowerCase()) ||
          cat.description.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Calculer le total de médicaments
    const totalMedicaments = categories.reduce((sum, cat) => sum + cat.nbMedicaments, 0)

    return NextResponse.json({
      data: categories,
      total: categories.length,
      totalMedicaments,
    })
  } catch (error) {
    console.error('Erreur GET categorie-atc:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des catégories ATC' },
      { status: 500 }
    )
  }
}
