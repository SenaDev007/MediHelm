import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const poste = searchParams.get('poste')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (poste) where.poste = poste

    const data = await db.employe.findMany({
      where,
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET employes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des employés' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.employe.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST employes:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de l\'employé' }, { status: 500 })
  }
}
