import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const type = searchParams.get('type')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (type) where.type = type
    if (dateDebut || dateFin) {
      const periodeDebut: Record<string, Date> = {}
      if (dateDebut) periodeDebut.gte = new Date(dateDebut)
      if (dateFin) periodeDebut.lte = new Date(dateFin)
      where.periodeDebut = periodeDebut
    }

    const data = await db.rapportFinancier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET rapports-financiers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des rapports financiers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, type, periodeDebut, periodeFin, pdfUrl } = body

    if (!pharmacieId || !type || !periodeDebut || !periodeFin || !pdfUrl) {
      return NextResponse.json(
        { error: 'pharmacieId, type, periodeDebut, periodeFin et pdfUrl requis' },
        { status: 400 }
      )
    }

    const data = await db.rapportFinancier.create({
      data: {
        pharmacieId,
        type,
        periodeDebut: new Date(periodeDebut),
        periodeFin: new Date(periodeFin),
        pdfUrl,
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST rapports-financiers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du rapport financier' },
      { status: 500 }
    )
  }
}
