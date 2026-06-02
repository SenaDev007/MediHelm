import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get pharmacies with SoBAPS delivery confirmations
    const pharmacies = await db.pharmacie.findMany({
      where: {
        actif: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        nom: true,
        ville: true,
        departement: true,
        latitude: true,
        longitude: true,
        confirmationsSoBAPS: {
          select: {
            id: true,
            statut: true,
            dateReception: true,
          },
          take: 1,
          orderBy: { dateReception: 'desc' },
        },
      },
      take: 500,
    })

    const results = pharmacies.map(p => {
      const confirmation = p.confirmationsSoBAPS[0]
      let statutAcquittement: 'action_taken' | 'acknowledged' | 'notified' | 'none' = 'none'

      if (confirmation) {
        if (confirmation.statut === 'CONFORME') {
          statutAcquittement = 'action_taken'
        } else if (confirmation.statut === 'AVEC_ECART') {
          statutAcquittement = 'acknowledged'
        } else {
          statutAcquittement = 'notified'
        }
      }

      return {
        id: p.id,
        nom: p.nom,
        ville: p.ville,
        departement: p.departement,
        latitude: p.latitude,
        longitude: p.longitude,
        statutAcquittement,
        dateNotification: confirmation?.dateReception?.toISOString() || null,
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Erreur GET carte officines SoBAPS:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
