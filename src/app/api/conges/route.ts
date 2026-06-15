import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/conges — Liste des congés
export async function GET(request: NextRequest) {
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
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    if (!body.dateDebut || !body.dateFin) {
      return NextResponse.json(
        { error: 'Les dates de début et de fin sont requises' },
        { status: 400 }
      )
    }

    const data = await db.conge.create({
      data: {
        pharmacieId: user.pharmacieId,
        type: body.type || 'ANNUEL',
        dateDebut: new Date(body.dateDebut),
        dateFin: new Date(body.dateFin),
        motif: body.motif || null,
        statut: body.statut || 'EN_ATTENTE',
        approuvePar: body.approuvePar || null,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST conges:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du congé' },
      { status: 500 }
    )
  }
}
