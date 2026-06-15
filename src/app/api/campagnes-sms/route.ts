import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

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

    if (!body.titre || !body.message) {
      return NextResponse.json(
        { error: 'Le titre et le message sont requis' },
        { status: 400 }
      )
    }

    const data = await db.campagneSms.create({
      data: {
        pharmacieId: user.pharmacieId,
        titre: body.titre,
        message: body.message,
        destinataires: body.destinataires || 0,
        envoyes: 0,
        statut: body.statut || 'BROUILLON',
        dateEnvoi: body.dateEnvoi ? new Date(body.dateEnvoi) : null,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST campagnes-sms:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la campagne SMS' },
      { status: 500 }
    )
  }
}
