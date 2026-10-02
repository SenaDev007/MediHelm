import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// POST: Verify a medication by lot number
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const { numeroLot } = body

    if (!numeroLot) {
      return NextResponse.json(
        { error: 'Le paramètre numeroLot est obligatoire' },
        { status: 400 }
      )
    }

    // Find the lot by its number
    const lot = await db.lot.findFirst({
      where: { numeroLot },
      include: {
        medicament: {
          include: {
            surveillances: {
              where: { statut: 'ACTIVE' },
            },
          },
        },
      },
    })

    if (!lot) {
      return NextResponse.json({
        valide: false,
        raison: 'LOT_INTROUVABLE',
        message: `Aucun lot trouvé avec le numéro "${numeroLot}"`,
      })
    }

    const now = new Date()
    const estExpire = lot.dateExpiration <= now
    const aStock = lot.quantite > 0

    // Check if medication is under DPMED surveillance
    const surveillanceActive = lot.medicament.surveillances.length > 0

    // Check for DPMED alerts related to this medication's DCI
    const alertesDPMED = await db.alerteDPMED.findMany({
      where: {
        dciConcernee: lot.medicament.dci,
        statut: 'EN_DIFFUSION',
      },
    })

    const rappelEnCours = alertesDPMED.length > 0

    // Determine overall validity
    let valide = true
    let raisons: string[] = []

    if (estExpire) {
      valide = false
      raisons.push('LOT_EXPIRE')
    }

    if (!aStock) {
      valide = false
      raisons.push('STOCK_EPUISE')
    }

    if (surveillanceActive) {
      valide = false
      raisons.push('SURVEILLANCE_DPMED')
    }

    if (rappelEnCours) {
      valide = false
      raisons.push('RAPPEL_DPMED')
    }

    return NextResponse.json({
      valide,
      raisons: raisons.length > 0 ? raisons : undefined,
      lot: {
        id: lot.id,
        numeroLot: lot.numeroLot,
        quantite: lot.quantite,
        dateExpiration: lot.dateExpiration,
        dateReception: lot.dateReception,
      },
      medicament: {
        id: lot.medicament.id,
        nomCommercial: lot.medicament.nomCommercial,
        dci: lot.medicament.dci,
        dosage: lot.medicament.dosage,
        forme: lot.medicament.forme,
      },
      estExpire,
      aStock,
      surveillanceActive,
      rappelEnCours,
      alertesDPMED: alertesDPMED.map((a) => ({
        id: a.id,
        titre: a.titre,
        typeAlerte: a.typeAlerte,
        niveauUrgence: a.niveauUrgence,
        referenceOfficielle: a.referenceOfficielle,
      })),
      surveillances: lot.medicament.surveillances.map((s) => ({
        id: s.id,
        typeSurveillance: s.typeSurveillance,
        description: s.description,
        niveauRisque: s.niveauRisque,
      })),
    })
  } catch (error) {
    console.error('Erreur POST patient/verifier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du médicament' },
      { status: 500 }
    )
  }
}
