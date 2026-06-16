import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M13_DOCUMENTS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const allowedCoffreTypes = ['LICENCE', 'CERTIFICATION']

    const where: Record<string, unknown> = {
      pharmacieId,
      type: { in: allowedCoffreTypes },
    }

    if (type && allowedCoffreTypes.includes(type)) {
      where.type = type
    }

    if (search) {
      where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * limit

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.document.count({ where }),
    ])

    return NextResponse.json({
      data: documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET coffre-numerique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents du coffre numérique' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M13_DOCUMENTS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { type, titre, fichierUrl, statut, dateValidite } = body

    if (!type || !titre) {
      return NextResponse.json(
        { error: 'Les champs type et titre sont requis' },
        { status: 400 }
      )
    }

    const allowedTypes = ['LICENCE', 'CERTIFICATION']
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: `Le type doit être l'un des suivants : ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const document = await db.document.create({
      data: {
        pharmacieId,
        type,
        titre,
        fichierUrl: fichierUrl || null,
        statut: statut || 'BROUILLON',
        dateValidite: dateValidite ? new Date(dateValidite) : null,
        creePar: user.id,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Erreur POST coffre-numerique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du document au coffre numérique' },
      { status: 500 }
    )
  }
}
