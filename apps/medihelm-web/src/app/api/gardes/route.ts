import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, gardeSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/gardes — Liste des plannings de garde
export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M09_GARDE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (type) where.type = type

    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      where.date = dateFilter
    }

    const [data, total] = await Promise.all([
      db.planningGarde.findMany({
        where,
        orderBy: { date: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.planningGarde.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET gardes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des plannings de garde' },
      { status: 500 }
    )
  }
}

// POST /api/gardes — Créer un planning de garde
export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M09_GARDE', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const validation = validate(gardeSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    const result = await db.planningGarde.create({
      data: {
        pharmacieId: user.pharmacieId,
        date: new Date(data.dateDebut),
        dateDebut: new Date(data.dateDebut),
        dateFin: new Date(data.dateFin),
        type: 'NORMALE' as const,
        rapport: data.note || null,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erreur POST gardes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du planning de garde' },
      { status: 500 }
    )
  }
}
