import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: DPMED_ADMIN or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const alerteId = searchParams.get('alerteId')

    // Get pharmacies with geo data
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
        numeroAgrement: true,
        diffusionsAlerte: alerteId
          ? {
              where: { alerteId },
              select: {
                id: true,
                statut: true,
                dateAcquittement: true,
                commentaire: true,
                alerteId: true,
                createdAt: true,
                alerte: {
                  select: { titre: true, typeAlerte: true },
                },
              },
              take: 1,
            }
          : false,
      },
    })

    // If no specific alert filter, get the latest diffusion for each pharmacy
    if (!alerteId) {
      // Fetch all diffusions for geo-located pharmacies
      const allDiffusions = await db.diffusionAlerte.findMany({
        where: {
          pharmacieId: { in: pharmacies.map(p => p.id) },
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['pharmacieId'],
        select: {
          id: true,
          pharmacieId: true,
          statut: true,
          dateAcquittement: true,
          commentaire: true,
          alerteId: true,
          createdAt: true,
          alerte: {
            select: { titre: true, typeAlerte: true },
          },
        },
      })

      const diffusionMap = new Map(allDiffusions.map(d => [d.pharmacieId, d]))

      // Transform data for map rendering
      const mappedPharmacies = pharmacies.map(p => {
        const diffusion = diffusionMap.get(p.id)
        let statutAcquittement: string = 'none'
        let alerteTitre: string | undefined
        let alerteType: string | undefined
        let dateNotification: string | undefined

        if (diffusion) {
          if (diffusion.statut === 'ACQUITTEE') statutAcquittement = 'acknowledged'
          else if (diffusion.statut === 'RECUE') statutAcquittement = 'notified'
          else if (diffusion.statut === 'NON_CONCERNEE') statutAcquittement = 'action_taken'
          else statutAcquittement = 'notified'
          alerteTitre = diffusion.alerte?.titre
          alerteType = diffusion.alerte?.typeAlerte
          dateNotification = diffusion.createdAt.toISOString()
        }

        return {
          id: p.id,
          nom: p.nom,
          ville: p.ville,
          latitude: p.latitude,
          longitude: p.longitude,
          numeroAgrement: p.numeroAgrement,
          statutAcquittement,
          alerteTitre,
          alerteType,
          dateNotification,
        }
      })

      // Summary stats
      const totalPharmaciesGeo = mappedPharmacies.length
      const totalPharmaciesAll = await db.pharmacie.count({ where: { actif: true } })

      return NextResponse.json({
        pharmacies: mappedPharmacies,
        summary: {
          totalPharmacies: totalPharmaciesAll,
          pharmaciesGeoLocalisees: totalPharmaciesGeo,
          sansGeo: totalPharmaciesAll - totalPharmaciesGeo,
        },
      })
    }

    // When alerteId is specified, transform pharmacies with their diffusion data
    const mappedPharmacies = pharmacies.map(p => {
      const diffusions = p.diffusionsAlerte as unknown as Array<{
        id: string
        statut: string
        dateAcquittement: Date | null
        commentaire: string | null
        alerteId: string
        createdAt: Date
        alerte: { titre: string; typeAlerte: string } | null
      }> | undefined

      let statutAcquittement: string = 'none'
      let alerteTitre: string | undefined
      let alerteType: string | undefined
      let dateNotification: string | undefined

      if (diffusions && diffusions.length > 0) {
        const diffusion = diffusions[0]
        if (diffusion.statut === 'ACQUITTEE') statutAcquittement = 'acknowledged'
        else if (diffusion.statut === 'RECUE') statutAcquittement = 'notified'
        else if (diffusion.statut === 'NON_CONCERNEE') statutAcquittement = 'action_taken'
        else statutAcquittement = 'notified'
        alerteTitre = diffusion.alerte?.titre
        alerteType = diffusion.alerte?.typeAlerte
        dateNotification = diffusion.createdAt.toISOString()
      }

      return {
        id: p.id,
        nom: p.nom,
        ville: p.ville,
        latitude: p.latitude,
        longitude: p.longitude,
        numeroAgrement: p.numeroAgrement,
        statutAcquittement,
        alerteTitre,
        alerteType,
        dateNotification,
      }
    })

    // Summary stats
    const totalPharmaciesGeo = mappedPharmacies.length
    const totalPharmaciesAll = await db.pharmacie.count({ where: { actif: true } })

    return NextResponse.json({
      pharmacies: mappedPharmacies,
      summary: {
        totalPharmacies: totalPharmaciesAll,
        pharmaciesGeoLocalisees: totalPharmaciesGeo,
        sansGeo: totalPharmaciesAll - totalPharmaciesGeo,
      },
    })
  } catch (error) {
    console.error('Erreur carte couverture:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des données géographiques' },
      { status: 500 }
    )
  }
}
