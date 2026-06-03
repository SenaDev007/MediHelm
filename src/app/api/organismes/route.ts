import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId

    const data = await db.organisme.findMany({
      where,
      include: {
        _count: { select: { tiersPayants: true } },
      },
      orderBy: { nom: 'asc' },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET organismes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des organismes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.organisme.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST organismes:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de l\'organisme' }, { status: 500 })
  }
}
