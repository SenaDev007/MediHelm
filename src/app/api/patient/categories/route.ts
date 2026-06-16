import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// ATC category descriptions (public config)
const ATC_DESCRIPTIONS: Record<string, string> = {
  A: 'Voies digestives et métabolisme',
  B: 'Sang et organes hématopoïétiques',
  C: 'Système cardiovasculaire',
  D: 'Dermatologiques',
  G: 'Système génito-urinaire et hormones sexuelles',
  H: 'Hormones systémiques, hors hormones sexuelles',
  J: 'Anti-infectieux systémiques',
  L: 'Antinéoplasiques et immunomodulateurs',
  M: 'Système musculo-squelettique',
  N: 'Système nerveux',
  P: 'Antiparasitaires, insecticides et répulsifs',
  R: 'Système respiratoire',
  S: 'Organes sensoriels',
  V: 'Divers',
}

// Patient-friendly category labels for filters
const PATIENT_LABELS: Record<string, string> = {
  A: 'Digestif & Métabolisme',
  B: 'Sang',
  C: 'Cardiovasculaire',
  D: 'Dermatologie',
  G: 'Génito-urinaire',
  H: 'Hormones',
  J: 'Anti-infectieux',
  L: 'Cancérologie',
  M: 'Musculo-squelettique',
  N: 'Neurologie',
  P: 'Antiparasitaires',
  R: 'Respiratoire',
  S: 'Sensoriel',
  V: 'Divers',
}

// GET /api/patient/categories — ATC categories for patient search filters
// Public endpoint (no auth required) — returns medication categories for the search filter
export async function GET(request: Request) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.SEARCH)
  if (rateLimitResult) return rateLimitResult

  try {
    // Get medication counts by ATC category across all active pharmacies
    const medicationCounts = await db.medicament.groupBy({
      by: ['categorieAtc'],
      where: { actif: true },
      _count: { id: true },
    })

    const countMap = new Map<string, number>()
    for (const item of medicationCounts) {
      if (item.categorieAtc) {
        countMap.set(item.categorieAtc, item._count.id)
      }
    }

    // Build categories list from DB data + static config
    const categories = Object.entries(ATC_DESCRIPTIONS)
      .map(([code, description]) => ({
        code,
        description,
        patientLabel: PATIENT_LABELS[code] || description,
        nbMedicaments: countMap.get(code) || 0,
      }))
      .filter(cat => cat.nbMedicaments > 0) // Only show categories that have medications
      .sort((a, b) => b.nbMedicaments - a.nbMedicaments) // Most popular first

    return NextResponse.json({
      categories,
      total: categories.length,
    })
  } catch (error) {
    console.error('Erreur GET patient categories:', error)
    // Fallback to static categories if DB fails
    const fallback = Object.entries(ATC_DESCRIPTIONS).map(([code, description]) => ({
      code,
      description,
      patientLabel: PATIENT_LABELS[code] || description,
      nbMedicaments: 0,
    }))

    return NextResponse.json({
      categories: fallback,
      total: fallback.length,
    })
  }
}
