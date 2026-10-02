import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requirePatientAccess } from '@/lib/api-auth'
import { validate, ordonnancePatientUploadSchema } from '@/lib/validations'

// GET: List prescriptions for a patient
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const access = await requirePatientAccess(request, searchParams.get('patientId'), 'M06_ORDONNANCES', 'read')
    if (access instanceof Response) return access

    const ordonnances = await db.ordonnance.findMany({
      where: { patientId: access.patientId },
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
    const validation = validate(ordonnancePatientUploadSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data
    const access = await requirePatientAccess(request, data.patientId, 'M06_ORDONNANCES', 'write')
    if (access instanceof Response) return access

    const patient = await db.patient.findUnique({
      where: { id: access.patientId },
      select: { pharmacieId: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 })

    // Validate pharmacy
    const targetPharmacieId = access.user.roleName === 'PATIENT'
      ? patient.pharmacieId
      : access.user.roleName === 'PLATFORM_ADMIN'
        ? data.pharmacieId
        : access.user.pharmacieId
    if (!targetPharmacieId) {
      return NextResponse.json(
        { error: 'pharmacieId est obligatoire' },
        { status: 400 }
      )
    }
    const pharmacie = await db.pharmacie.findFirst({ where: { id: targetPharmacieId, actif: true } })
    if (!pharmacie) {
      return NextResponse.json({ error: 'Pharmacie non trouvée' }, { status: 404 })
    }
    const dateOrdonnance = new Date(data.dateOrdonnance)
    if (!Number.isFinite(dateOrdonnance.getTime())) {
      return NextResponse.json({ error: 'Date d’ordonnance invalide' }, { status: 400 })
    }

    // Create prescription with optional lines
    const ordonnance = await db.$transaction(async (tx) => {
      const ord = await tx.ordonnance.create({
        data: {
          patientId: access.patientId,
          pharmacieId: targetPharmacieId,
          prescripteur: data.prescripteur,
          dateOrdonnance,
          imageUrl: data.imageUrl || null,
          notes: data.notes || null,
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
