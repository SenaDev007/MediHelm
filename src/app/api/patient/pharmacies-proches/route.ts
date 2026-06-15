import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined
    const medicamentId = searchParams.get('medicamentId') || undefined
    const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : 20

    // If a medication ID is provided, find pharmacies that carry it
    let pharmacyIdsWithMed: Set<string> | null = null
    let medicamentPrix: Record<string, number> = {}

    if (medicamentId) {
      // Find all medications with this ID that are active, include their lots
      const meds = await db.medicament.findMany({
        where: { id: medicamentId, actif: true },
        select: {
          pharmacieId: true,
          prixPublic: true,
          lots: {
            where: {
              quantite: { gt: 0 },
              dateExpiration: { gt: new Date() },
            },
            select: { id: true },
          },
        },
      })

      pharmacyIdsWithMed = new Set<string>()
      for (const med of meds) {
        // Only include pharmacies that have active lots with stock
        if (med.lots.length > 0) {
          pharmacyIdsWithMed.add(med.pharmacieId)
          medicamentPrix[med.pharmacieId] = med.prixPublic
        }
      }
    }

    // Get pharmacies
    const pharmacies = await db.pharmacie.findMany({
      where: {
        actif: true,
        latitude: { not: null },
        longitude: { not: null },
        ...(pharmacyIdsWithMed !== null ? {
          id: { in: Array.from(pharmacyIdsWithMed) },
        } : {}),
      },
      include: {
        planningsGarde: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
          take: 1,
        },
      },
      take: 200,
    })

    // Build results with actual stock availability
    const results = pharmacies
      .map((p) => {
        const distance = lat && lng && p.latitude && p.longitude
          ? haversine(lat, lng, p.latitude, p.longitude)
          : 0
        const estGarde = p.planningsGarde.length > 0

        // Determine medication availability based on actual stock
        let medicamentDispo = false
        let prixMedicament: number | null = null

        if (medicamentId && pharmacyIdsWithMed) {
          // We already filtered to only pharmacies with stock
          medicamentDispo = pharmacyIdsWithMed.has(p.id)
          prixMedicament = medicamentPrix[p.id] ?? null
        } else if (!medicamentId) {
          // No medication filter — availability not applicable, default true
          medicamentDispo = true
        }

        return {
          id: p.id,
          nom: p.nom,
          adresse: p.adresse,
          ville: p.ville,
          telephone: p.telephone,
          latitude: p.latitude,
          longitude: p.longitude,
          distance,
          estGarde,
          medicamentDispo,
          prixMedicament,
        }
      })
      .filter((p) => !lat || !lng || p.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Erreur GET pharmacies proches:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recherche de pharmacies' },
      { status: 500 }
    )
  }
}
