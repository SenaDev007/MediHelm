import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId

    const data = await db.scorePharmacie.findMany({
      where,
      orderBy: { calculatedAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET score-pharmacie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du score pharmacie' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      pharmacieId,
      scoreSante,
      scoreStock,
      scoreFinance,
      scoreConformite,
      scoreRH,
      scorePharmacovigilance,
      scoreQualite,
    } = body

    if (!pharmacieId) {
      return NextResponse.json(
        { error: 'pharmacieId requis' },
        { status: 400 }
      )
    }

    // Check if a score already exists for this pharmacy
    const existing = await db.scorePharmacie.findFirst({
      where: { pharmacieId },
      orderBy: { calculatedAt: 'desc' },
    })

    const scoreData = {
      scoreSante: scoreSante !== undefined ? parseFloat(String(scoreSante)) : 0,
      scoreStock: scoreStock !== undefined ? parseFloat(String(scoreStock)) : 0,
      scoreFinance: scoreFinance !== undefined ? parseFloat(String(scoreFinance)) : 0,
      scoreConformite: scoreConformite !== undefined ? parseFloat(String(scoreConformite)) : 0,
      scoreRH: scoreRH !== undefined ? parseFloat(String(scoreRH)) : 0,
      scorePharmacovigilance: scorePharmacovigilance !== undefined ? parseFloat(String(scorePharmacovigilance)) : 0,
      scoreQualite: scoreQualite !== undefined ? parseFloat(String(scoreQualite)) : 0,
    }

    let data

    if (existing) {
      // Update existing score
      data = await db.scorePharmacie.update({
        where: { id: existing.id },
        data: {
          ...scoreData,
          calculatedAt: new Date(),
        },
      })
    } else {
      // Create new score
      data = await db.scorePharmacie.create({
        data: {
          pharmacieId,
          ...scoreData,
        },
      })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST score-pharmacie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création/mise à jour du score pharmacie' },
      { status: 500 }
    )
  }
}
