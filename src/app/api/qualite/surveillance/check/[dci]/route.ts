import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dci: string }> }
) {
  try {
    const { dci } = await params

    const surveillances = await db.medicamentSurveillance.findMany({
      where: {
        dci: { contains: dci, mode: 'insensitive' },
        statut: 'ACTIVE',
      },
      include: {
        signalementsEI: { take: 5, orderBy: { createdAt: 'desc' } },
        alertesDPMED: { where: { statut: { in: ['EN_DIFFUSION', 'DIFFUSEE'] } }, take: 5 },
      },
    })

    const alertes = surveillances.map((s) => ({
      id: s.id,
      typeSurveillance: s.typeSurveillance,
      description: s.description,
      niveauRisque: s.niveauRisque,
      dateEmission: s.dateEmission,
      sourceAlerte: s.sourceAlerte,
    }))

    return NextResponse.json({
      dci,
      sousSurveillance: surveillances.length > 0,
      alertes,
    })
  } catch (error) {
    console.error('Erreur GET surveillance check:', error)
    return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 })
  }
}
