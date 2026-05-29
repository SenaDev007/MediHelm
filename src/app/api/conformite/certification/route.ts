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
      return NextResponse.json({ error: 'Certification non trouvée' }, { status: 404 })
    }

    return NextResponse.json({
      pharmacieId,
      certificationDPMED: data.certificationDPMED,
      dateCertification: data.dateCertification,
      dateExpirCertification: data.dateExpirCertification,
      scoreTotal: data.scoreTotal,
    })
  } catch (error) {
    console.error('Erreur GET certification:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, certificationDPMED, dateCertification, dateExpirCertification } = body

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const data = await db.scoreConformite.upsert({
      where: { pharmacieId },
      update: {
        certificationDPMED: certificationDPMED ?? true,
        dateCertification: dateCertification ?? new Date(),
        dateExpirCertification,
      },
      create: {
        pharmacieId,
        scoreTotal: 0,
        scoreRegistreStup: 0,
        scoreAlerteDPMED: 0,
        scoreDocuments: 0,
        scorePharmacovigi: 0,
        scoreDestructions: 0,
        certificationDPMED: certificationDPMED ?? true,
        dateCertification: dateCertification ?? new Date(),
        dateExpirCertification,
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur POST certification:', error)
    return NextResponse.json({ error: 'Erreur lors de la certification' }, { status: 500 })
  }
}
