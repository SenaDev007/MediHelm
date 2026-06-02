import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'patientId requis' }, { status: 400 })
    }

    const ordonnances = await db.ordonnance.findMany({
      where: { patientId },
      include: {
        lignes: {
          include: {
            medicament: { select: { nomCommercial: true, dci: true, dosage: true } },
            medicamentSub: { select: { nomCommercial: true } },
          },
        },
        validations: { include: { utilisateur: { select: { nom: true, prenom: true } } } },
      },
      orderBy: { dateOrdonnance: 'desc' },
      take: 50,
    })

    return NextResponse.json(ordonnances)
  } catch (error) {
    console.error('Erreur GET ordonnances patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, pharmacieId, prescripteurNom, dateOrdonnance, imageOrdonnanceUrl, estStupefiant } = body

    if (!patientId || !pharmacieId || !prescripteurNom) {
      return NextResponse.json({ error: 'patientId, pharmacieId et prescripteurNom requis' }, { status: 400 })
    }

    const ordonnance = await db.ordonnance.create({
      data: {
        pharmacieId,
        patientId,
        prescripteurNom,
        dateOrdonnance: dateOrdonnance ? new Date(dateOrdonnance) : new Date(),
        dateReception: new Date(),
        statut: 'RECUE',
        estStupefiant: estStupefiant || false,
        imageOrdonnanceUrl,
      },
    })

    return NextResponse.json(ordonnance, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ordonnance patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}
