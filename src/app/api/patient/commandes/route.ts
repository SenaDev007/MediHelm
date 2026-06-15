import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: List orders for a patient
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

    const commandes = await db.commandePatient.findMany({
      where: { patientId },
      include: {
        lignes: {
          include: {
            medicament: {
              select: {
                id: true,
                nomCommercial: true,
                dci: true,
                forme: true,
              },
            },
          },
        },
        pharmacie: {
          select: {
            id: true,
            nom: true,
            adresse: true,
            ville: true,
            telephone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(commandes)
  } catch (error) {
    console.error('Erreur GET patient/commandes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    )
  }
}

// POST: Create a new order from cart items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, pharmacieId, lignes, notes } = body

    if (!patientId || !pharmacieId || !lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json(
        { error: 'patientId, pharmacieId et lignes (non vides) sont obligatoires' },
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

    // Calculate total and validate items
    let montantTotal = 0
    const lignesData: Array<{
      medicamentId: string | null
      dci: string
      quantite: number
      prixUnitaire: number
      prixTotal: number
    }> = []

    for (const ligne of lignes) {
      const { medicamentId, dci, quantite, prixUnitaire } = ligne

      if (!dci || !quantite || quantite <= 0) {
        return NextResponse.json(
          { error: 'Chaque ligne doit avoir un dci et une quantité positive' },
          { status: 400 }
        )
      }

      let prix = prixUnitaire

      // If medicamentId is provided, verify it and get price
      if (medicamentId) {
        const medicament = await db.medicament.findFirst({
          where: { id: medicamentId, pharmacieId, actif: true },
        })
        if (!medicament) {
          return NextResponse.json(
            { error: `Médicament ${medicamentId} non trouvé dans cette pharmacie` },
            { status: 404 }
          )
        }
        prix = medicament.prixPublic
      }

      if (!prix || prix <= 0) {
        return NextResponse.json(
          { error: 'Le prix unitaire doit être positif' },
          { status: 400 }
        )
      }

      const prixTotal = prix * quantite
      montantTotal += prixTotal

      lignesData.push({
        medicamentId: medicamentId || null,
        dci,
        quantite,
        prixUnitaire: prix,
        prixTotal,
      })
    }

    // Create order with lines in a transaction
    const commande = await db.$transaction(async (tx) => {
      const cmd = await tx.commandePatient.create({
        data: {
          patientId,
          pharmacieId,
          montantTotal,
          notes: notes || null,
          statut: 'EN_ATTENTE',
          lignes: {
            create: lignesData,
          },
        },
        include: {
          lignes: true,
        },
      })

      return cmd
    })

    return NextResponse.json(commande, { status: 201 })
  } catch (error) {
    console.error('Erreur POST patient/commandes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
      { status: 500 }
    )
  }
}
