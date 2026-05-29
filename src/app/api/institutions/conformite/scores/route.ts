import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const scores = await db.scoreConformite.findMany({
      include: {
        pharmacie: {
          select: {
            id: true,
            nom: true,
            ville: true,
            numeroAgrement: true,
          },
        },
      },
      orderBy: { scoreTotal: 'asc' },
    })

    return NextResponse.json(scores)
  } catch (error) {
    console.error('Erreur GET scores conformité:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
