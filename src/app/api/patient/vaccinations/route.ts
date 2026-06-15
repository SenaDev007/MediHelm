import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: List vaccinations for a patient
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json(
        { error: 'Le paramètre patientId est requis' },
        { status: 400 }
      )
    }

    const vaccinations = await db.vaccination.findMany({
      where: { patientId },
      include: {
        pharmacie: {
          select: {
            id: true,
            nom: true,
            adresse: true,
            ville: true,
          },
        },
      },
      orderBy: { dateVaccin: 'desc' },
    })

    return NextResponse.json(vaccinations)
  } catch (error) {
    console.error('Erreur GET patient/vaccinations:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des vaccinations' },
      { status: 500 }
    )
  }
}

// POST: Add a vaccination record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, pharmacieId, vaccin, dateVaccin, lot, prochaineDose } = body

    if (!patientId || !pharmacieId || !vaccin || !dateVaccin) {
      return NextResponse.json(
        { error: 'patientId, pharmacieId, vaccin et dateVaccin sont obligatoires' },
        { status: 400 }
      )
    }

    // Validate patient exists
    const patient = await db.patient.findUnique({ where: { id: patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 })
    }

    // Validate pharmacy exists
    const pharmacie = await db.pharmacie.findUnique({ where: { id: pharmacieId } })
    if (!pharmacie) {
      return NextResponse.json({ error: 'Pharmacie non trouvée' }, { status: 404 })
    }

    const vaccination = await db.vaccination.create({
      data: {
        patientId,
        pharmacieId,
        vaccin,
        dateVaccin: new Date(dateVaccin),
        lot: lot || null,
        prochaineDose: prochaineDose ? new Date(prochaineDose) : null,
      },
    })

    return NextResponse.json(vaccination, { status: 201 })
  } catch (error) {
    console.error('Erreur POST patient/vaccinations:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'ajout de la vaccination" },
      { status: 500 }
    )
  }
}
