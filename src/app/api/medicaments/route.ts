import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, medicamentSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const dci = searchParams.get('dci')
    const nomCommercial = searchParams.get('nomCommercial')
    const forme = searchParams.get('forme')
    const search = searchParams.get('search')
    const actif = searchParams.get('actif')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const sortBy = searchParams.get('sortBy') || 'nomCommercial'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const where: Record<string, unknown> = { pharmacieId }
    if (dci) where.dci = { contains: dci, mode: 'insensitive' }
    if (nomCommercial) where.nomCommercial = { contains: nomCommercial, mode: 'insensitive' }
    if (forme) where.forme = forme
    if (actif !== null && actif !== undefined) where.actif = actif === 'true'
    if (search) {
      where.OR = [
        { dci: { contains: search, mode: 'insensitive' } },
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { dosage: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Only filter by actif if not explicitly requested
    if (actif === null || actif === undefined) {
      // default: show active only
    }

    const [data, total] = await Promise.all([
      db.medicament.findMany({
        where,
        include: { lots: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.medicament.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET medicaments:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des médicaments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    // Zod validation
    const validation = validate(medicamentSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Données invalides', details: validation.errors.flatten() }, { status: 400 })
    }
    const validatedData = validation.data

    // Enforce pharmacieId from authenticated user
    const data = await db.medicament.create({ data: { ...validatedData, pharmacieId: user.pharmacieId } })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST medicaments:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du médicament' }, { status: 500 })
  }
}
