import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dci = searchParams.get('dci')

    const where: Record<string, unknown> = {}
    if (dci) where.dci = { contains: dci, mode: 'insensitive' }

    const data = await db.ficheDCI.findMany({ where, take: 100 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET fiche DCI:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des fiches DCI' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.ficheDCI.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST fiche DCI:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la fiche DCI' }, { status: 500 })
  }
}
