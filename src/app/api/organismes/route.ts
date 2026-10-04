import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/organismes — Liste des organismes
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M10_REMBOURSABLES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const actif = searchParams.get('actif')

    const where: Record<string, unknown> = {}

    if (actif !== null && actif !== undefined && actif !== '') {
      where.actif = actif === 'true'
    }

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      db.organisme.findMany({
        where,
        include: {
          pharmacieLinks: {
            where: { pharmacieId: user.pharmacieId },
            select: { id: true, tauxRemboursement: true, actif: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.organisme.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET organismes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des organismes' },
      { status: 500 }
    )
  }
}

// POST /api/organismes — Créer un organisme
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M10_REMBOURSABLES', 'write')
    if (authResult instanceof Response) return authResult

    const body = await request.json()

    if (!body.nom) {
      return NextResponse.json(
        { error: 'Le nom de l\'organisme est requis' },
        { status: 400 }
      )
    }

    const data = await db.organisme.create({
      data: {
        nom: body.nom,
        type: body.type || 'ASSURANCE',
        actif: body.actif !== undefined ? body.actif : true,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST organismes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'organisme' },
      { status: 500 }
    )
  }
}
