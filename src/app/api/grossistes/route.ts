import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const actif = searchParams.get('actif')

    const where: Record<string, unknown> = {}
    if (actif !== null) where.actif = actif === 'true'

    const data = await db.partenaireGrossiste.findMany({
      where,
      include: { catalogue: true },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET grossistes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des grossistes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.partenaireGrossiste.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST grossistes:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du grossiste' }, { status: 500 })
  }
}
