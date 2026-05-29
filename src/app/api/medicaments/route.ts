import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const dci = searchParams.get('dci')
    const nomCommercial = searchParams.get('nomCommercial')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (dci) where.dci = { contains: dci, mode: 'insensitive' }
    if (nomCommercial) where.nomCommercial = { contains: nomCommercial, mode: 'insensitive' }
    if (search) {
      where.OR = [
        { dci: { contains: search, mode: 'insensitive' } },
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { codeCIP: { contains: search } },
      ]
    }

    const data = await db.medicament.findMany({
      where,
      include: { lots: true },
      take: 100,
    })
    return NextResponse.json(data)
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
