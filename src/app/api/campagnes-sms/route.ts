import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, campagneSmsSchema } from '@/lib/validations'

// GET /api/campagnes-sms — Liste des campagnes SMS
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M12_COMMUNICATION', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (statut) where.statut = statut

    const [data, total] = await Promise.all([
      db.campagneSms.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.campagneSms.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET campagnes-sms:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des campagnes SMS' },
      { status: 500 }
    )
  }
}

// POST /api/campagnes-sms — Créer une campagne SMS
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M12_COMMUNICATION', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const validation = validate(campagneSmsSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    const result = await db.campagneSms.create({
      data: {
        pharmacieId: user.pharmacieId,
        titre: data.titre,
        message: data.message,
        destinataires: data.destinataires?.length || 0,
        envoyes: 0,
        statut: 'BROUILLON',
        dateEnvoi: data.dateEnvoi ? new Date(data.dateEnvoi) : null,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erreur POST campagnes-sms:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la campagne SMS' },
      { status: 500 }
    )
  }
}
