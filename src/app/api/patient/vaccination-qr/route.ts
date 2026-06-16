// ============================================================
// MediHelm — Données QR Code de vaccination
// GET /api/patient/vaccination-qr
// Route publique (ou avec authentification patient)
// Retourne les données de vaccination pour affichage QR code
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult

    // 1. Extraire les paramètres de requête
    const { searchParams } = new URL(request.url)
    const vaccinationId = searchParams.get('vaccinationId') as string | null
    const patientId = searchParams.get('patientId') as string | null

    // 2. Au moins un identifiant est requis
    if (!vaccinationId && !patientId) {
      return NextResponse.json(
        { error: 'Paramètre requis : vaccinationId ou patientId' },
        { status: 400 }
      )
    }

    // 3. Cas 1 : Recherche par ID de vaccination spécifique
    if (vaccinationId) {
      const vaccination = await db.vaccination.findUnique({
        where: { id: vaccinationId },
        include: {
          patient: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              dateNaissance: true,
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
      })

      if (!vaccination) {
        return NextResponse.json(
          { error: 'Vaccination non trouvée' },
          { status: 404 }
        )
      }

      // Retourner les données formatées pour QR code
      return NextResponse.json({
        type: 'vaccination',
        data: {
          vaccinationId: vaccination.id,
          vaccin: vaccination.vaccin,
          dateVaccin: vaccination.dateVaccin?.toISOString() || null,
          lot: vaccination.lot,
          prochaineDose: vaccination.prochaineDose?.toISOString() || null,
          patient: {
            id: vaccination.patient.id,
            nom: vaccination.patient.nom,
            prenom: vaccination.patient.prenom,
            dateNaissance: vaccination.patient.dateNaissance?.toISOString() || null,
          },
          pharmacie: {
            id: vaccination.pharmacie.id,
            nom: vaccination.pharmacie.nom,
            adresse: vaccination.pharmacie.adresse,
            ville: vaccination.pharmacie.ville,
            telephone: vaccination.pharmacie.telephone,
          },
        },
        qrData: JSON.stringify({
          vid: vaccination.id,
          v: vaccination.vaccin,
          d: vaccination.dateVaccin?.toISOString(),
          l: vaccination.lot,
          p: `${vaccination.patient.prenom} ${vaccination.patient.nom}`,
          ph: vaccination.pharmacie.nom,
        }),
      })
    }

    // 4. Cas 2 : Recherche par patient (liste de toutes les vaccinations)
    if (patientId) {
      const patient = await db.patient.findUnique({
        where: { id: patientId },
      })

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient non trouvé' },
          { status: 404 }
        )
      }

      const vaccinations = await db.vaccination.findMany({
        where: { patientId },
        include: {
          pharmacie: {
            select: {
              id: true,
              nom: true,
              ville: true,
            },
          },
        },
        orderBy: { dateVaccin: 'desc' },
      })

      return NextResponse.json({
        type: 'patient_vaccinations',
        patient: {
          id: patient.id,
          nom: patient.nom,
          prenom: patient.prenom,
          dateNaissance: patient.dateNaissance?.toISOString() || null,
        },
        vaccinations: vaccinations.map((v) => ({
          vaccinationId: v.id,
          vaccin: v.vaccin,
          dateVaccin: v.dateVaccin.toISOString(),
          lot: v.lot,
          prochaineDose: v.prochaineDose?.toISOString() || null,
          pharmacie: v.pharmacie,
          qrData: JSON.stringify({
            vid: v.id,
            v: v.vaccin,
            d: v.dateVaccin.toISOString(),
            l: v.lot,
            p: `${patient.prenom} ${patient.nom}`,
            ph: v.pharmacie.nom,
          }),
        })),
      })
    }

    return NextResponse.json(
      { error: 'Requête invalide' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Erreur récupération données vaccination QR:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données de vaccination' },
      { status: 500 }
    )
  }
}
