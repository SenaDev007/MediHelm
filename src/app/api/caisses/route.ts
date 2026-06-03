import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const actif = searchParams.get('actif')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (actif !== null) where.actif = actif === 'true'

    const data = await db.caisse.findMany({
      where,
      include: {
        sessionsCaisse: {
          where: { dateFermeture: null },
          take: 1,
        },
      },
      orderBy: { numero: 'asc' },
      take: 50,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET caisses:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des caisses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, nom, numero } = body

    if (!pharmacieId || !nom) {
      return NextResponse.json({ error: 'pharmacieId et nom requis' }, { status: 400 })
    }

    const data = await db.caisse.create({
      data: {
        pharmacieId,
        nom,
        numero: numero || 1,
        actif: true,
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST caisse:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la caisse' }, { status: 500 })
  }
}
