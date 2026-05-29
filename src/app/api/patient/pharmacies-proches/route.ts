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

    const pharmacies = await db.pharmacie.findMany({
      where: {
        actif: true,
        latitude: { not: null },
        longitude: { not: null },
        ...(medicamentId ? {
          medicaments: {
            some: { id: medicamentId, actif: true }
          }
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

    // Add distance calculation and garde status
    const results = pharmacies
      .map(p => {
        const distance = lat && lng && p.latitude && p.longitude
          ? haversine(lat, lng, p.latitude, p.longitude)
          : 0
        const estGarde = p.planningsGarde.length > 0
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
          medicamentDispo: !!medicamentId,
        }
      })
      .filter(p => !lat || !lng || p.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Erreur GET pharmacies proches:', error)
    return NextResponse.json({ error: 'Erreur lors de la recherche de pharmacies' }, { status: 500 })
  }
}
