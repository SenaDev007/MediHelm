import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validate, creditSchema } from '@/lib/validations'

// GET /api/credits — Liste des crédits
export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M10_REMBOURSABLES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const patientId = searchParams.get('patientId')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (patientId) where.patientId = patientId
    if (statut) where.statut = statut

    const [data, total] = await Promise.all([
      db.credit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.credit.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET credits:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des crédits' },
      { status: 500 }
    )
  }
}

// POST /api/credits — Créer un crédit
export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M10_REMBOURSABLES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const validation = validate(creditSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    const result = await db.credit.create({
      data: {
        pharmacieId: user.pharmacieId,
        patientId: data.patientId,
        montant: data.montant,
        montantPaye: 0,
        statut: 'EN_COURS',
        echeance: data.echeance ? new Date(data.echeance) : null,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erreur POST credits:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du crédit' },
      { status: 500 }
    )
  }
}
