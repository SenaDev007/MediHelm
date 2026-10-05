import { db } from '@backend/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { validate, vaccinationSchema } from '@backend/lib/validations'
import { requirePatientAccess } from '@backend/lib/api-auth'

// GET: List vaccinations for a patient
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const access = await requirePatientAccess(request, searchParams.get('patientId'), 'M05_PATIENTS', 'read')
    if (access instanceof Response) return access

    const vaccinations = await db.vaccination.findMany({
      where: { patientId: access.patientId },
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
    const validation = validate(vaccinationSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    const access = await requirePatientAccess(request, data.patientId, 'M05_PATIENTS', 'write')
    if (access instanceof Response) return access

    const patient = await db.patient.findUnique({ where: { id: access.patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 })
    }

    const vaccination = await db.vaccination.create({
      data: {
        patientId: access.patientId,
        pharmacieId: patient.pharmacieId,
        vaccin: data.vaccin,
        dateVaccin: new Date(data.dateVaccin),
        lot: data.lot || null,
        prochaineDose: data.prochaineDose ? new Date(data.prochaineDose) : null,
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
