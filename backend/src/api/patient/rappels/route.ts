import { db } from '@backend/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requirePatientAccess } from '@backend/lib/api-auth'

// GET: List reminders for a patient
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const access = await requirePatientAccess(request, searchParams.get('patientId'), 'M05_PATIENTS', 'read')
    if (access instanceof Response) return access
    const patientId = access.patientId
    const actifOnly = searchParams.get('actif') === 'true'

    const where: Record<string, unknown> = { patientId }
    if (actifOnly) {
      where.actif = true
    }

    const rappels = await db.rappel.findMany({
      where,
      orderBy: { dateDebut: 'desc' },
    })

    return NextResponse.json(rappels)
  } catch (error) {
    console.error('Erreur GET patient/rappels:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des rappels' },
      { status: 500 }
    )
  }
}

// POST: Create a new medication reminder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, medicamentNom, dosage, frequence, heureRappel, dateDebut, dateFin, notes } = body

    if (!patientId || !medicamentNom || !dateDebut) {
      return NextResponse.json(
        { error: 'patientId, medicamentNom et dateDebut sont obligatoires' },
        { status: 400 }
      )
    }

    const access = await requirePatientAccess(request, patientId, 'M05_PATIENTS', 'write')
    if (access instanceof Response) return access
    const parsedDateDebut = new Date(dateDebut)
    const parsedDateFin = dateFin ? new Date(dateFin) : null
    if (!Number.isFinite(parsedDateDebut.getTime()) || (parsedDateFin && !Number.isFinite(parsedDateFin.getTime()))) {
      return NextResponse.json({ error: 'Dates de rappel invalides' }, { status: 400 })
    }

    const rappel = await db.rappel.create({
      data: {
        patientId: access.patientId,
        medicamentNom,
        dosage: dosage || null,
        frequence: frequence || null,
        heureRappel: heureRappel || null,
        dateDebut: parsedDateDebut,
        dateFin: parsedDateFin,
        notes: notes || null,
        actif: true,
      },
    })

    return NextResponse.json(rappel, { status: 201 })
  } catch (error) {
    console.error('Erreur POST patient/rappels:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du rappel' },
      { status: 500 }
    )
  }
}
