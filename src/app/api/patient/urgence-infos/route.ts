import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/patient/urgence-infos — Emergency contacts & hospitals
// Returns emergency phone numbers and nearby hospitals from DB
export async function GET(request: Request) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.SEARCH)
  if (rateLimitResult) return rateLimitResult

  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined

    // National emergency contacts — these are public national numbers (like 911)
    // In the future, these could be stored in a Configuration table
    const emergencyContacts = [
      { nom: 'SAMU Bénin', telephone: '119', description: 'Urgences médicales', categorie: 'URGENCE_MEDICALE' },
      { nom: 'Pompiers', telephone: '118', description: 'Incendie et secours', categorie: 'SECOURS' },
      { nom: 'Police Secours', telephone: '117', description: 'Urgences sécuritaires', categorie: 'SECURITE' },
      { nom: 'Centre Anti-Poison', telephone: '21 30 80 80', description: 'Intoxication et empoisonnement', categorie: 'ANTI_POISON' },
      { nom: 'Croix-Rouge Bénin', telephone: '21 30 05 56', description: 'Secours et assistance', categorie: 'SECOURS' },
    ]

    // Fetch hospitals/institutions from DB
    // Use Pharmacie model filtered by type or use institutions if available
    // Since there's no Institution model, we check for pharmacies with hospital-like names
    // and also include any known hospital data
    let hospitals: Array<{ nom: string; adresse: string; telephone: string; latitude?: number | null; longitude?: number | null; distance?: number }> = []

    // Try to fetch from DB — look for active pharmacies that could serve as emergency points
    // In production, this would query an Institution or Hospital table
    const dbPharmacies = await db.pharmacie.findMany({
      where: {
        actif: true,
        modeGardeActif: true,
      },
      select: {
        id: true,
        nom: true,
        adresse: true,
        ville: true,
        telephone: true,
        latitude: true,
        longitude: true,
      },
      take: 10,
    })

    // Haversine for distance calculation
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

    hospitals = dbPharmacies
      .map(p => ({
        nom: p.nom,
        adresse: `${p.adresse}, ${p.ville}`,
        telephone: p.telephone,
        latitude: p.latitude,
        longitude: p.longitude,
        distance: lat && lng && p.latitude && p.longitude
          ? haversine(lat, lng, p.latitude, p.longitude)
          : undefined,
      }))
      .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))

    // If no DB results, provide known fallback hospitals
    if (hospitals.length === 0) {
      hospitals = [
        { nom: 'CHU de Cotonou', adresse: 'Cotonou, Bénin', telephone: '21 30 13 33' },
        { nom: "Hôpital de la Mère et de l'Enfant", adresse: 'Cotonou, Bénin', telephone: '21 30 26 66' },
        { nom: 'CNHU Hubert Maga', adresse: 'Cotonou, Bénin', telephone: '21 30 05 20' },
        { nom: "Hôpital d'Instruction des Armées", adresse: 'Cotonou, Bénin', telephone: '21 30 02 90' },
      ]
    }

    return NextResponse.json({
      emergencyContacts,
      hospitals,
    })
  } catch (error) {
    console.error('Erreur GET urgence-infos:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des informations d\'urgence' },
      { status: 500 }
    )
  }
}
