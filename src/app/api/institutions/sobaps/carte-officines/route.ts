import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: SOBAPS_VIEWER or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M03_COMMANDES', 'read')
  if (auth instanceof Response) return auth

  try {
    // Get officine locations with delivery confirmation status
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
        latitude: true,
        longitude: true,
        telephone: true,
        ordonnancesGrossiste: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            statut: true,
            createdAt: true,
            reception: {
              select: {
                id: true,
                statut: true,
                dateReception: true,
              },
            },
          },
        },
      },
    })

    // Transform for map display
    const officines = pharmacies.map(p => {
      let statutAcquittement: string = 'none'
      let dateNotification: string | undefined

      if (p.ordonnancesGrossiste.length > 0) {
        const lastOrder = p.ordonnancesGrossiste[0]
        if (lastOrder.statut === 'LIVREE') statutAcquittement = 'action_taken'
        else if (lastOrder.statut === 'CONFIRMEE' || lastOrder.statut === 'EN_PREPARATION')
          statutAcquittement = 'acknowledged'
        else if (lastOrder.statut === 'ENVOYEE') statutAcquittement = 'notified'
        dateNotification = lastOrder.createdAt.toISOString()
      }

      return {
        id: p.id,
        nom: p.nom,
        ville: p.ville,
        latitude: p.latitude,
        longitude: p.longitude,
        telephone: p.telephone,
        statutAcquittement,
        dateNotification,
      }
    })

    return NextResponse.json({
      officines,
      summary: {
        total: officines.length,
        livrees: officines.filter(o => o.statutAcquittement === 'action_taken').length,
        confirmees: officines.filter(o => o.statutAcquittement === 'acknowledged').length,
        enAttente: officines.filter(o => o.statutAcquittement === 'notified').length,
        sansCommande: officines.filter(o => o.statutAcquittement === 'none').length,
      },
    })
  } catch (error) {
    console.error('Erreur carte officines:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des officines' },
      { status: 500 }
    )
  }
}
