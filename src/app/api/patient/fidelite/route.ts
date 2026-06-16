import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET: Get loyalty points balance for a patient
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json(
        { error: 'Le paramètre patientId est requis' },
        { status: 400 }
      )
    }

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        pointsFidelite: true,
        pharmacie: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      patientId: patient.id,
      nom: patient.nom,
      prenom: patient.prenom,
      pointsFidelite: patient.pointsFidelite,
      pharmacie: patient.pharmacie,
    })
  } catch (error) {
    console.error('Erreur GET patient/fidelite:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des points de fidélité' },
      { status: 500 }
    )
  }
}
