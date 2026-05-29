import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const data = await db.scoreConformite.findUnique({
      where: { pharmacieId },
    })

    if (!data) {
      return NextResponse.json({ error: 'Score de conformité non trouvé' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET score conformité:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du score' }, { status: 500 })
  }
}
