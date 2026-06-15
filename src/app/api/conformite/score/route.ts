import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId

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
