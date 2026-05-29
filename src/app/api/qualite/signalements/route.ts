import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const gravite = searchParams.get('gravite')
    const statutEnvoi = searchParams.get('statutEnvoi')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (gravite) where.gravite = gravite
    if (statutEnvoi) where.statutEnvoi = statutEnvoi

    const data = await db.signalementEI.findMany({
      where,
      include: { medicament: true, medicamentSurv: true, utilisateur: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET signalements:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des signalements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.signalementEI.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST signalements:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du signalement' }, { status: 500 })
  }
}
