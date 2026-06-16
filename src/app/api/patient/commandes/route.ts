import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { validate, commandeSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/api-auth'

// GET: List orders for a patient
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'read')
    if (authResult instanceof Response) return authResult

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
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'write')
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const validation = validate(commandeSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Validate patient exists
    const patient = await db.patient.findUnique({ where: { id: body.patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 })
    }

    // Validate pharmacy
    const pharmacieId = body.pharmacieId || patient.pharmacieId
    const pharmacie = await db.pharmacie.findUnique({ where: { id: pharmacieId } })
    if (!pharmacie) {
      return NextResponse.json({ error: 'Pharmacie non trouvée' }, { status: 404 })
    }

    // Calculate total
    let montantTotal = 0
    const lignesData: Array<{
      dci: string
      nomCommercial: string | null
      quantite: number
      prixAchat: number
      prixTotal: number
    }> = []

    for (const ligne of data.lignes) {
      const prixTotal = ligne.prixAchat * ligne.quantite
      montantTotal += prixTotal
      lignesData.push({
        dci: ligne.dci,
        nomCommercial: ligne.nomCommercial || null,
        quantite: ligne.quantite,
        prixAchat: ligne.prixAchat,
        prixTotal,
      })
    }

    // Create order with lines in a transaction
    const commande = await db.$transaction(async (tx) => {
      const cmd = await tx.commandePatient.create({
        data: {
          patientId: body.patientId,
          pharmacieId,
          montantTotal,
          notes: body.notes || null,
          statut: 'RECUE' as const,
          lignes: {
            create: lignesData.map(l => ({
              dci: l.dci,
              quantite: l.quantite,
              prixUnitaire: l.prixAchat,
              prixTotal: l.prixTotal,
            })),
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
