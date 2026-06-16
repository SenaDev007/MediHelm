import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, congeSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/conges — Liste des congés
export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M07_RH', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const statut = searchParams.get('statut')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (type) where.type = type
    if (statut) where.statut = statut

    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      where.dateDebut = dateFilter
    }

    const [data, total] = await Promise.all([
      db.conge.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.conge.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET conges:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des congés' },
      { status: 500 }
    )
  }
}

// POST /api/conges — Créer un congé
export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const validation = validate(congeSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    const result = await db.conge.create({
      data: {
        pharmacieId: user.pharmacieId,
        type: data.type,
        dateDebut: new Date(data.dateDebut),
        dateFin: new Date(data.dateFin),
        motif: data.motif || null,
        statut: 'EN_ATTENTE',
        approuvePar: null,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erreur POST conges:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du congé' },
      { status: 500 }
    )
  }
}
