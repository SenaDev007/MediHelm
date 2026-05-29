import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const email = searchParams.get('email')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (email) where.email = email

    const data = await db.utilisateur.findMany({
      where,
      include: { role: true, pharmacie: true },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET utilisateurs:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des utilisateurs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.utilisateur.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST utilisateurs:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de l\'utilisateur' }, { status: 500 })
  }
}
