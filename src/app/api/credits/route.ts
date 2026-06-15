import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/credits — Liste des crédits
export async function GET(request: NextRequest) {
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
  try {
    const authResult = await requireAuth(request, 'M10_REMBOURSABLES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    if (!body.montant || body.montant <= 0) {
      return NextResponse.json(
        { error: 'Le montant du crédit est requis et doit être positif' },
        { status: 400 }
      )
    }

    const data = await db.credit.create({
      data: {
        pharmacieId: user.pharmacieId,
        patientId: body.patientId || null,
        montant: body.montant,
        montantPaye: body.montantPaye || 0,
        statut: body.statut || 'EN_COURS',
        echeance: body.echeance ? new Date(body.echeance) : null,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST credits:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du crédit' },
      { status: 500 }
    )
  }
}
