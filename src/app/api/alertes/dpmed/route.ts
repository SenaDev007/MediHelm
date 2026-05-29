import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = { statut: { in: ['EN_DIFFUSION', 'DIFFUSEE'] } }
    if (pharmacieId) {
      const diffusions = await db.diffusionAlerte.findMany({
        where: { pharmacieId },
        select: { alerteId: true },
      })
      where.id = { in: diffusions.map((d) => d.alerteId) }
    }

    const alertes = await db.alerteDPMED.findMany({
      where,
      include: {
        medicamentSurv: true,
        diffusions: { where: pharmacieId ? { pharmacieId } : {} },
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
