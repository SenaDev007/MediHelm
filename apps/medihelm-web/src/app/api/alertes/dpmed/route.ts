import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId

    const where: Record<string, unknown> = { statut: { in: ['EN_DIFFUSION', 'DIFFUSEE'] } }

    const diffusions = await db.diffusionAlerte.findMany({
      where: { pharmacieId },
      select: { alerteId: true },
    })
    where.id = { in: diffusions.map((d) => d.alerteId) }

    const alertes = await db.alerteDPMED.findMany({
      where,
      include: {
        diffusions: { where: { pharmacieId } },
      },
      orderBy: { dateEmissionDPMED: 'desc' },
      take: 50,
    })

    return NextResponse.json(alertes)
  } catch (error) {
    console.error('Erreur GET alertes DPMED:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des alertes' }, { status: 500 })
  }
}
