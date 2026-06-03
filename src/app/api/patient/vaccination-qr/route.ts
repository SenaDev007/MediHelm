import { NextRequest, NextResponse } from 'next/server'
import { generateVaccinationQR } from '@/lib/qrcode'
import { db } from '@/lib/db'

// GET /api/patient/vaccination-qr?comptePatientId=xxx
export async function GET(request: NextRequest) {
  try {
    const comptePatientId = request.nextUrl.searchParams.get('comptePatientId')
    if (!comptePatientId) {
      return NextResponse.json({ error: 'comptePatientId requis' }, { status: 400 })
    }

    const compte = await db.comptePatient.findUnique({
      where: { id: comptePatientId },
      include: { vaccinations: true },
    })

    if (!compte) {
      return NextResponse.json({ error: 'Compte patient non trouvé' }, { status: 404 })
    }

    const qrDataUrl = await generateVaccinationQR({
      patientId: compte.id,
      patientNom: compte.nom,
      patientPrenom: compte.prenom,
      vaccinations: compte.vaccinations.map(v => ({
        vaccin: v.vaccin,
        date: v.dateVaccination.toISOString(),
        lot: v.numeroLot,
      })),
    })

    return NextResponse.json({ qr: qrDataUrl })
  } catch (error) {
    console.error('Erreur génération QR vaccination:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du QR code' }, { status: 500 })
  }
}
