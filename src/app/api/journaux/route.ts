import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const code = searchParams.get('code')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (code) where.code = code

    const data = await db.journal.findMany({
      where,
      include: { ecritures: { orderBy: { date: 'desc' }, take: 50 } },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET journaux:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des journaux' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, code, libelle } = body

    if (!pharmacieId || !code || !libelle) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const data = await db.journal.create({
      data: { pharmacieId, code, libelle },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST journal:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du journal' }, { status: 500 })
  }
}
