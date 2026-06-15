import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const dci = searchParams.get('dci')
    const nomCommercial = searchParams.get('nomCommercial')
    const forme = searchParams.get('forme')
    const search = searchParams.get('search')
    const actif = searchParams.get('actif')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const sortBy = searchParams.get('sortBy') || 'nomCommercial'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
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
    const body = await request.json()
    const data = await db.medicament.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST medicaments:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du médicament' }, { status: 500 })
  }
}
