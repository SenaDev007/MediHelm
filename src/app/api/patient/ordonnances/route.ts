import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, ordonnanceSchema } from '@/lib/validations'

// GET: List prescriptions for a patient
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M06_ORDONNANCES', 'read')
    if (authResult instanceof Response) return authResult

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
    const authResult = await requireAuth(request, 'M06_ORDONNANCES', 'write')
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const validation = validate(ordonnanceSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data
    const { patientId, pharmacieId, imageUrl, notes } = body

    // Validate pharmacy
    const targetPharmacieId = pharmacieId
    if (!targetPharmacieId) {
      return NextResponse.json(
        { error: 'pharmacieId est obligatoire' },
        { status: 400 }
      )
    }
    const pharmacie = await db.pharmacie.findUnique({ where: { id: targetPharmacieId } })
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
          pharmacieId: targetPharmacieId,
          prescripteur: data.prescripteur,
          dateOrdonnance: new Date(data.dateOrdonnance),
          imageUrl: imageUrl || null,
          notes: notes || null,
          statut: 'RECUE',
          lignes: data.lignes && data.lignes.length > 0
            ? {
                create: data.lignes.map((ligne) => ({
                  medicamentId: null,
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
