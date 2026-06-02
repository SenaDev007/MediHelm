import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const typeAlerte = searchParams.get('typeAlerte')
    const niveauUrgence = searchParams.get('niveauUrgence')

    const where: Record<string, unknown> = { statut: 'ARCHIVEE' }

    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      where.dateEmissionDPMED = dateFilter
    }

    if (typeAlerte) where.typeAlerte = typeAlerte
    if (niveauUrgence) where.niveauUrgence = niveauUrgence

    const alertes = await db.alerteDPMED.findMany({
      where,
      include: {
        medicamentSurv: { select: { dci: true, typeSurveillance: true, niveauRisque: true } },
        diffusions: { select: { pharmacieId: true, dateAcquittement: true } },
      },
      orderBy: { dateEmissionDPMED: 'desc' },
      take: 100,
    })

    return NextResponse.json(alertes)
  } catch (error) {
    console.error('Erreur GET historique alertes DPMED:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
