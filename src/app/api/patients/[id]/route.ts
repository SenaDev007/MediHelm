import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const patient = await db.patient.findFirst({
      where: { id, pharmacieId },
      include: {
        ventes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            reference: true,
            montantTotal: true,
            montantPaye: true,
            modePaiement: true,
            statut: true,
            createdAt: true,
          },
        },
        ordonnances: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            lignes: {
              select: {
                id: true,
                dci: true,
                posologie: true,
                quantite: true,
                delivree: true,
                medicamentId: true,
              },
            },
          },
        },
        vaccinations: {
          orderBy: { dateVaccin: 'desc' },
        },
      },
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient non trouvé' },
        { status: 404 }
      )
    }

    // Calculate credit used
    const unpaidVentes = await db.vente.findMany({
      where: {
        patientId: id,
        pharmacieId,
        modePaiement: 'CREDIT',
        statut: { in: ['VALIDEE', 'EN_COURS'] },
      },
      select: { montantTotal: true, montantPaye: true },
    })
    const creditUtilise = unpaidVentes.reduce(
      (sum, v) => sum + (v.montantTotal - v.montantPaye),
      0
    )

    return NextResponse.json({ ...patient, creditUtilise })
  } catch (error) {
    console.error('Erreur GET patient:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du patient' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { pharmacieId } = body

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    // Verify patient belongs to this pharmacie
    const existing = await db.patient.findFirst({
      where: { id, pharmacieId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Patient non trouvé' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'nom', 'prenom', 'telephone', 'email', 'dateNaissance', 'sexe',
      'numeroAssurance', 'assurance', 'adresse', 'notes',
      'creditAutorise', 'creditLimite', 'actif',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'dateNaissance' && body[field]) {
          updateData[field] = new Date(body[field])
        } else if (field === 'dateNaissance' && !body[field]) {
          updateData[field] = null
        } else {
          updateData[field] = body[field]
        }
      }
    }

    const patient = await db.patient.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(patient)
  } catch (error) {
    console.error('Erreur PUT patient:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du patient' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { pharmacieId } = body

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const existing = await db.patient.findFirst({
      where: { id, pharmacieId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Patient non trouvé' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'nom', 'prenom', 'telephone', 'email', 'dateNaissance', 'sexe',
      'numeroAssurance', 'assurance', 'adresse', 'notes',
      'creditAutorise', 'creditLimite', 'actif',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'dateNaissance' && body[field]) {
          updateData[field] = new Date(body[field])
        } else if (field === 'dateNaissance' && !body[field]) {
          updateData[field] = null
        } else {
          updateData[field] = body[field]
        }
      }
    }

    const patient = await db.patient.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(patient)
  } catch (error) {
    console.error('Erreur PATCH patient:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du patient' },
      { status: 500 }
    )
  }
}
