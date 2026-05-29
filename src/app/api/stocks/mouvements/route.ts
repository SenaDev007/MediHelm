import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const lotId = searchParams.get('lotId')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (lotId) where.lotId = lotId
    if (type) where.type = type

    const data = await db.mouvementStock.findMany({
      where,
      include: { lot: true, utilisateur: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET mouvements:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des mouvements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.mouvementStock.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST mouvements:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du mouvement' }, { status: 500 })
  }
}
