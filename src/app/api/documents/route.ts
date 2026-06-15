import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/documents — Liste des documents
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M13_DOCUMENTS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const search = searchParams.get('search') || ''
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (type) where.type = type
    if (statut) where.statut = statut

    if (search) {
      where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.document.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET documents:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    )
  }
}

// POST /api/documents — Créer un document (métadonnées)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M13_DOCUMENTS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    if (!body.titre || !body.type) {
      return NextResponse.json(
        { error: 'Le titre et le type du document sont requis' },
        { status: 400 }
      )
    }

    const data = await db.document.create({
      data: {
        pharmacieId: user.pharmacieId,
        type: body.type,
        titre: body.titre,
        fichierUrl: body.fichierUrl || null,
        statut: body.statut || 'BROUILLON',
        dateValidite: body.dateValidite ? new Date(body.dateValidite) : null,
        creePar: user.id,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST documents:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du document' },
      { status: 500 }
    )
  }
}
