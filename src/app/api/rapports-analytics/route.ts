import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const domaine = searchParams.get('domaine')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (domaine) where.domaine = { contains: domaine, mode: 'insensitive' }
    if (dateDebut || dateFin) {
      const periodeDebut: Record<string, Date> = {}
      if (dateDebut) periodeDebut.gte = new Date(dateDebut)
      if (dateFin) periodeDebut.lte = new Date(dateFin)
      where.periodeDebut = periodeDebut
    }

    const data = await db.rapportAnalytics.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET rapports-analytics:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des rapports analytics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, domaine, periodeDebut, periodeFin, donnees, pdfUrl } = body

    if (!pharmacieId || !domaine || !periodeDebut || !periodeFin || !donnees) {
      return NextResponse.json(
        { error: 'pharmacieId, domaine, periodeDebut, periodeFin et donnees requis' },
        { status: 400 }
      )
    }

    const data = await db.rapportAnalytics.create({
      data: {
        pharmacieId,
        domaine,
        periodeDebut: new Date(periodeDebut),
        periodeFin: new Date(periodeFin),
        donnees,
        pdfUrl: pdfUrl || null,
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST rapports-analytics:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du rapport analytics' },
      { status: 500 }
    )
  }
}
