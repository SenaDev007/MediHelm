import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const numeroLot = searchParams.get('numeroLot')
    const medicamentId = searchParams.get('medicamentId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (numeroLot) where.numeroLot = { contains: numeroLot, mode: 'insensitive' }
    if (medicamentId) where.medicamentId = medicamentId

    const data = await db.lot.findMany({
      where,
      include: { medicament: true },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET lots:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des lots' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.lot.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST lots:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du lot' }, { status: 500 })
  }
}
