import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { validate, vaccinationSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/api-auth'

// GET: List vaccinations for a patient
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult

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
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'write')
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const validation = validate(vaccinationSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Validate patient exists
    const patient = await db.patient.findUnique({ where: { id: data.patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 })
    }

    const vaccination = await db.vaccination.create({
      data: {
        patientId: data.patientId,
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
