import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = { pharmacieId }

    if (date) {
      const dateFilter = new Date(date)
      where.date = {
        gte: new Date(dateFilter.getFullYear(), dateFilter.getMonth(), dateFilter.getDate()),
        lt: new Date(dateFilter.getFullYear(), dateFilter.getMonth(), dateFilter.getDate() + 1),
      }
    }

    if (statut) {
      where.statut = statut
    }

    const skip = (page - 1) * limit

    const [presences, total] = await Promise.all([
      db.presence.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      db.presence.count({ where }),
    ])

    return NextResponse.json({
      data: presences,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET presences:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des présences' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { date, heureArrivee, statut } = body

    if (!date) {
      return NextResponse.json(
        { error: 'La date est requise' },
        { status: 400 }
      )
    }

    const presence = await db.presence.create({
      data: {
        pharmacieId,
        date: new Date(date),
        heureArrivee: heureArrivee ? new Date(heureArrivee) : new Date(),
        heureDepart: null,
        statut: statut || 'PRESENT',
      },
    })

    return NextResponse.json(presence, { status: 201 })
  } catch (error) {
    console.error('Erreur POST presences:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la présence' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { id, heureDepart, statut } = body

    if (!id) {
      return NextResponse.json(
        { error: 'L\'identifiant de la présence est requis' },
        { status: 400 }
      )
    }

    // Vérifier que la présence appartient à la pharmacie
    const existingPresence = await db.presence.findFirst({
      where: { id, pharmacieId },
    })

    if (!existingPresence) {
      return NextResponse.json(
        { error: 'Présence introuvable dans cette pharmacie' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (heureDepart !== undefined) data.heureDepart = new Date(heureDepart)
    if (statut !== undefined) data.statut = statut

    const updated = await db.presence.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH presences:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la présence' },
      { status: 500 }
    )
  }
}
