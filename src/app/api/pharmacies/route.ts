import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const numeroAgrement = searchParams.get('numeroAgrement')
    const garde = searchParams.get('garde')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.id = pharmacieId
    if (numeroAgrement) where.numeroAgrement = numeroAgrement

    // If garde=semaine, include planningsGarde for this week
    if (garde === 'semaine') {
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday
      endOfWeek.setHours(23, 59, 59, 999)

      const data = await db.pharmacie.findMany({
        where: {
          ...where,
          actif: true,
          planningsGarde: {
            some: {
              date: {
                gte: startOfWeek,
                lte: endOfWeek,
              },
            },
          },
        },
        include: {
          planningsGarde: {
            where: {
              date: {
                gte: startOfWeek,
                lte: endOfWeek,
              },
            },
            orderBy: { date: 'asc' },
          },
          scoreConformite: true,
        },
        take: 100,
      })
      return NextResponse.json(data)
    }

    // Default: include planningsGarde for today if requested
    const includeGarde = searchParams.get('includeGarde') === 'true'

    const data = await db.pharmacie.findMany({
      where,
      include: {
        scoreConformite: true,
        ...(includeGarde ? {
          planningsGarde: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lte: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
            take: 1,
          },
        } : {}),
      },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET pharmacies:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des pharmacies' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.pharmacie.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST pharmacies:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la pharmacie' }, { status: 500 })
  }
}
