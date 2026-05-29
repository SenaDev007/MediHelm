import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where = pharmacieId ? { pharmacieId } : {}
    const data = await db.confirmationReceptionSoBAPS.findMany({
      where,
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET réceptions SoBAPS:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.confirmationReceptionSoBAPS.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST réception SoBAPS:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}
