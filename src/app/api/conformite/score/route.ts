import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    // Use findFirst instead of findUnique (pharmacieId is not unique constraint)
    const data = await db.scoreConformite.findFirst({
      where: { pharmacieId },
    })

    if (!data) {
      // Return default scores instead of 404
      return NextResponse.json({
        pharmacieId,
        scoreTotal: 0,
        scoreRegistreStup: 0,
        scoreAlerteDPMED: 0,
        scoreDocuments: 0,
        scorePharmacovigilance: 0,
        scoreDestructions: 0,
        certificationDPMED: false,
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET score conformité:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du score' }, { status: 500 })
  }
}
