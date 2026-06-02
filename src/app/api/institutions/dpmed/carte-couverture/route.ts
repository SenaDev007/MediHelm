import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const alerteId = searchParams.get('alerteId') || undefined

    // Get all active pharmacies with coordinates
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
        diffusionsAlerte: {
          where: alerteId ? { alerteDPMEDId: alerteId } : {
            alerteDPMED: { statut: 'EN_DIFFUSION' },
          },
          select: {
            id: true,
            statut: true,
            dateEnvoi: true,
            dateAcquittement: true,
            alerteDPMED: {
              select: {
                id: true,
                titre: true,
                typeAlerte: true,
              },
            },
          },
          take: 1,
          orderBy: { dateEnvoi: 'desc' },
        },
      },
      take: 500,
    })

    // Map to coverage data
    const results = pharmacies.map(p => {
      const diffusion = p.diffusionsAlerte[0]
      let statutAcquittement: 'action_taken' | 'acknowledged' | 'notified' | 'none' = 'none'

      if (diffusion) {
        if (diffusion.statut === 'ACQUITTEE' || diffusion.dateAcquittement) {
          statutAcquittement = 'acknowledged'
        } else if (diffusion.statut === 'ENVOYEE') {
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
        alerteTitre: diffusion?.alerteDPMED?.titre || null,
        alerteType: diffusion?.alerteDPMED?.typeAlerte || null,
        dateNotification: diffusion?.dateEnvoi?.toISOString() || null,
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Erreur GET carte couverture DPMED:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
