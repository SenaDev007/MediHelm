import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, ecritureSchema } from '@/lib/validations'

// GET /api/ecritures — Liste des écritures comptables pour la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M08_FINANCE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { pharmacieId }

    if (dateDebut || dateFin) {
      where.dateEcriture = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    if (type) {
      where.type = type
    }

    if (search) {
      where.OR = [
        { libelle: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.ecritureComptable.findMany({
        where,
        orderBy: { dateEcriture: 'desc' },
        skip,
        take: limit,
      }),
      db.ecritureComptable.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET ecritures:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des écritures comptables' },
      { status: 500 }
    )
  }
}

// POST /api/ecritures — Créer une nouvelle écriture comptable
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M08_FINANCE', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const validation = validate(ecritureSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    const ecriture = await db.ecritureComptable.create({
      data: {
        pharmacieId,
        type: data.type,
        montant: data.montant,
        libelle: data.libelle,
        reference: data.compte || data.pieceJustificative || null,
        dateEcriture: new Date(),
      },
    })

    return NextResponse.json(ecriture, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ecritures:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'écriture comptable' },
      { status: 500 }
    )
  }
}
