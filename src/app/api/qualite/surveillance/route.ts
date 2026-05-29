import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dci = searchParams.get('dci')
    const typeSurveillance = searchParams.get('typeSurveillance')
    const niveauRisque = searchParams.get('niveauRisque')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (dci) where.dci = { contains: dci, mode: 'insensitive' }
    if (typeSurveillance) where.typeSurveillance = typeSurveillance
    if (niveauRisque) where.niveauRisque = niveauRisque
    if (statut) where.statut = statut

    const data = await db.medicamentSurveillance.findMany({
      where,
      include: { signalementsEI: true, alertesDPMED: true },
      orderBy: { dateEmission: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET surveillance:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des surveillances' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.medicamentSurveillance.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST surveillance:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la surveillance' }, { status: 500 })
  }
}
