import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: List reminders for a patient
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const actifOnly = searchParams.get('actif') === 'true'

    if (!patientId) {
      return NextResponse.json(
        { error: 'Le paramètre patientId est requis' },
        { status: 400 }
      )
    }

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

    // Validate patient exists
    const patient = await db.patient.findUnique({ where: { id: patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 })
    }

    const rappel = await db.rappel.create({
      data: {
        patientId,
        medicamentNom,
        dosage: dosage || null,
        frequence: frequence || null,
        heureRappel: heureRappel || null,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
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
