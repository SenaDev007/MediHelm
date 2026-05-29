import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (statut) where.statut = statut

    const data = await db.alerteDPMED.findMany({
      where,
      include: { medicamentSurv: true },
      orderBy: { dateEmissionDPMED: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET portail alertes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.alerteDPMED.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST portail alerte:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'émission de l\'alerte' }, { status: 500 })
  }
}
