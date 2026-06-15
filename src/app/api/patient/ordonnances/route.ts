import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: List prescriptions for a patient
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

    const ordonnances = await db.ordonnance.findMany({
      where: { patientId },
      include: {
        lignes: true,
        pharmacie: {
          select: {
            id: true,
            nom: true,
            adresse: true,
            ville: true,
          },
        },
      },
      orderBy: { dateOrdonnance: 'desc' },
    })

    return NextResponse.json(ordonnances)
  } catch (error) {
    console.error('Erreur GET patient/ordonnances:', error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des ordonnances" },
      { status: 500 }
    )
  }
}

// POST: Upload/create a prescription record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, pharmacieId, prescripteur, dateOrdonnance, imageUrl, notes, lignes } = body

    if (!pharmacieId || !prescripteur || !dateOrdonnance) {
      return NextResponse.json(
        { error: 'pharmacieId, prescripteur et dateOrdonnance sont obligatoires' },
        { status: 400 }
      )
    }

    // Validate pharmacy exists
    const pharmacie = await db.pharmacie.findUnique({ where: { id: pharmacieId } })
    if (!pharmacie) {
      return NextResponse.json({ error: 'Pharmacie non trouvée' }, { status: 404 })
    }

    // If patientId provided, validate it
    if (patientId) {
      const patient = await db.patient.findUnique({ where: { id: patientId } })
      if (!patient) {
        return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 })
      }
    }

    // Create prescription with optional lines
    const ordonnance = await db.$transaction(async (tx) => {
      const ord = await tx.ordonnance.create({
        data: {
          patientId: patientId || null,
          pharmacieId,
          prescripteur,
          dateOrdonnance: new Date(dateOrdonnance),
          imageUrl: imageUrl || null,
          notes: notes || null,
          statut: 'RECUE',
          lignes: lignes && Array.isArray(lignes) && lignes.length > 0
            ? {
                create: lignes.map((ligne: { medicamentId?: string; dci: string; posologie?: string; quantite?: number }) => ({
                  medicamentId: ligne.medicamentId || null,
                  dci: ligne.dci,
                  posologie: ligne.posologie || null,
                  quantite: ligne.quantite || 1,
                  delivree: false,
                })),
              }
            : undefined,
        },
        include: {
          lignes: true,
        },
      })

      return ord
    })

    return NextResponse.json(ordonnance, { status: 201 })
  } catch (error) {
    console.error('Erreur POST patient/ordonnances:', error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'ordonnance" },
      { status: 500 }
    )
  }
}
