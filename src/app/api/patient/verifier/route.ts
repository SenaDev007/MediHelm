import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code') // barcode or QR code

    if (!code) {
      return NextResponse.json({ error: 'Code-barres requis' }, { status: 400 })
    }

    // Search for medication by EAN/CIP/barcode
    const medicament = await db.medicament.findFirst({
      where: {
        OR: [
          { codeEAN: code },
          { codeCIP: code },
        ],
        actif: true,
      },
      include: {
        lots: {
          where: { quantite: { gt: 0 } },
          select: { numeroLot: true, dateExpiration: true, quantite: true },
        },
      },
    })

    if (!medicament) {
      return NextResponse.json({
        statut: 'NON_REFERENCE',
        message: 'Ce médicament n\'est pas référencé dans notre base. Vérifiez le code ou consultez votre pharmacien.',
        code,
      })
    }

    // Check if under surveillance / recall
    const surveillance = await db.medicamentSurveillance.findFirst({
      where: {
        dci: medicament.dci,
        statut: 'ACTIVE',
      },
    })

    const alerteDPMED = await db.alerteDPMED.findFirst({
      where: {
        dciConcernee: medicament.dci,
        statut: { in: ['EN_DIFFUSION', 'DIFFUSEE'] },
      },
    })

    if (surveillance || alerteDPMED) {
      return NextResponse.json({
        statut: 'ALERTE',
        message: alerteDPMED
          ? `Alerte DPMED : ${alerteDPMED.titre}`
          : `Sous surveillance : ${surveillance?.description}`,
        medicament: {
          id: medicament.id,
          nomCommercial: medicament.nomCommercial,
          dci: medicament.dci,
          dosage: medicament.dosage,
          forme: medicament.forme,
        },
        alerte: alerteDPMED ? {
          reference: alerteDPMED.referenceOfficielle,
          titre: alerteDPMED.titre,
          type: alerteDPMED.typeAlerte,
          urgence: alerteDPMED.niveauUrgence,
        } : {
          type: surveillance?.typeSurveillance,
          risque: surveillance?.niveauRisque,
        },
        code,
      })
    }

    return NextResponse.json({
      statut: 'CONFORME',
      message: 'Ce médicament est référencé et ne fait l\'objet d\'aucune alerte active.',
      medicament: {
        id: medicament.id,
        nomCommercial: medicament.nomCommercial,
        dci: medicament.dci,
        dosage: medicament.dosage,
        forme: medicament.forme,
        estStupefiant: medicament.estStupefiant,
        estRemboursable: medicament.estRemboursable,
        lots: medicament.lots,
      },
      code,
    })
  } catch (error) {
    console.error('Erreur vérification médicament:', error)
    return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 })
  }
}

// POST /api/patient/verifier — Verify medication by barcode/QR code via body
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Code-barres requis' }, { status: 400 })
    }

    // Search for medication by EAN/CIP/barcode
    const medicament = await db.medicament.findFirst({
      where: {
        OR: [
          { codeEAN: code },
          { codeCIP: code },
        ],
        actif: true,
      },
      include: {
        lots: {
          where: { quantite: { gt: 0 } },
          select: { numeroLot: true, dateExpiration: true, quantite: true },
        },
      },
    })

    if (!medicament) {
      return NextResponse.json({
        statut: 'NON_REFERENCE',
        message: 'Ce médicament n\'est pas référencé dans notre base. Vérifiez le code ou consultez votre pharmacien.',
        code,
      })
    }

    // Check if under surveillance / recall
    const surveillance = await db.medicamentSurveillance.findFirst({
      where: {
        dci: medicament.dci,
        statut: 'ACTIVE',
      },
    })

    const alerteDPMED = await db.alerteDPMED.findFirst({
      where: {
        dciConcernee: medicament.dci,
        statut: { in: ['EN_DIFFUSION', 'DIFFUSEE'] },
      },
    })

    if (surveillance || alerteDPMED) {
      return NextResponse.json({
        statut: 'ALERTE',
        message: alerteDPMED
          ? `Alerte DPMED : ${alerteDPMED.titre}`
          : `Sous surveillance : ${surveillance?.description}`,
        medicament: {
          id: medicament.id,
          nomCommercial: medicament.nomCommercial,
          dci: medicament.dci,
          dosage: medicament.dosage,
          forme: medicament.forme,
        },
        alerte: alerteDPMED ? {
          reference: alerteDPMED.referenceOfficielle,
          titre: alerteDPMED.titre,
          type: alerteDPMED.typeAlerte,
          urgence: alerteDPMED.niveauUrgence,
        } : {
          type: surveillance?.typeSurveillance,
          risque: surveillance?.niveauRisque,
        },
        code,
      })
    }

    return NextResponse.json({
      statut: 'CONFORME',
      message: 'Ce médicament est référencé et ne fait l\'objet d\'aucune alerte active.',
      medicament: {
        id: medicament.id,
        nomCommercial: medicament.nomCommercial,
        dci: medicament.dci,
        dosage: medicament.dosage,
        forme: medicament.forme,
        estStupefiant: medicament.estStupefiant,
        estRemboursable: medicament.estRemboursable,
        lots: medicament.lots,
      },
      code,
    })
  } catch (error) {
    console.error('Erreur vérification médicament (POST):', error)
    return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 })
  }
}
