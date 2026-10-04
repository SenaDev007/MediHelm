import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, planningSchema } from '@/lib/validations'

// GET /api/plannings — Liste des plannings / emplois du temps
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    // Les plannings sont basés sur les PlanningGarde et Présences
    const whereGarde: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    const wherePresence: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      whereGarde.date = dateFilter
      wherePresence.date = dateFilter
    }

    // Combiner gardes et presences
    const [gardes, presences] = await Promise.all([
      db.planningGarde.findMany({
        where: whereGarde,
        orderBy: { date: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.presence.findMany({
        where: wherePresence,
        orderBy: { date: 'asc' },
        take: 50,
      }),
    ])

    const totalGardes = await db.planningGarde.count({ where: whereGarde })

    return NextResponse.json({
      data: {
        gardes,
        presences,
      },
      total: totalGardes,
      page,
      pageSize,
      totalPages: Math.ceil(totalGardes / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET plannings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des plannings' },
      { status: 500 }
    )
  }
}

// POST /api/plannings — Créer un planning
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const validation = validate(planningSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Un planning peut être une garde ou une présence
    if (data.type === 'GARDE') {
      const result = await db.planningGarde.create({
        data: {
          pharmacieId: user.pharmacieId,
          date: new Date(data.date),
          dateDebut: new Date(data.date + 'T' + data.heureDebut),
          dateFin: new Date(data.date + 'T' + data.heureFin),
          type: 'NORMALE',
          rapport: null,
        },
      })
      return NextResponse.json(result, { status: 201 })
    }

    // Par défaut, créer une présence
    const result = await db.presence.create({
      data: {
        pharmacieId: user.pharmacieId,
        date: new Date(data.date),
        heureArrivee: data.heureDebut ? new Date(data.date + 'T' + data.heureDebut) : new Date(),
        heureDepart: data.heureFin ? new Date(data.date + 'T' + data.heureFin) : null,
        statut: 'PRESENT',
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erreur POST plannings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du planning' },
      { status: 500 }
    )
  }
}
