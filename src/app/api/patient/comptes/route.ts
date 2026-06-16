import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { hash } from 'bcryptjs'
import { validate, patientSchema } from '@/lib/validations'

// POST: Register a new patient account
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'write')
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const validation = validate(patientSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data
    const { motDePasse, numeroAssurance, assurance, adresse, pharmacieId } = body

    if (!motDePasse || !data.email) {
      return NextResponse.json(
        { error: 'Le mot de passe et l\'email sont obligatoires' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.utilisateur.findUnique({ where: { email: data.email } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hash(motDePasse, 12)

    // Determine pharmacy — use provided or first active pharmacy
    let targetPharmacieId = pharmacieId || ''
    if (!targetPharmacieId) {
      const firstPharmacy = await db.pharmacie.findFirst({ where: { actif: true } })
      if (!firstPharmacy) {
        return NextResponse.json(
          { error: 'Aucune pharmacie active trouvée' },
          { status: 400 }
        )
      }
      targetPharmacieId = firstPharmacy.id
    }

    // Create Utilisateur with role PATIENT + Patient record in a transaction
    const result = await db.$transaction(async (tx) => {
      const utilisateur = await tx.utilisateur.create({
        data: {
          email: data.email!,
          nom: data.nom,
          prenom: data.prenom,
          motDePasse: hashedPassword,
          role: 'PATIENT',
          telephone: data.telephone,
          pharmacieId: targetPharmacieId,
          actif: true,
        },
      })

      const patient = await tx.patient.create({
        data: {
          utilisateurId: utilisateur.id,
          pharmacieId: targetPharmacieId,
          nom: data.nom,
          prenom: data.prenom,
          telephone: data.telephone,
          email: data.email,
          dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : null,
          sexe: data.sexe || null,
          numeroAssurance: numeroAssurance || null,
          assurance: assurance || null,
          adresse: adresse || null,
          actif: true,
        },
      })

      return { utilisateur, patient }
    })

    return NextResponse.json(
      {
        message: 'Compte patient créé avec succès',
        utilisateur: {
          id: result.utilisateur.id,
          email: result.utilisateur.email,
          nom: result.utilisateur.nom,
          prenom: result.utilisateur.prenom,
          role: result.utilisateur.role,
        },
        patient: {
          id: result.patient.id,
          nom: result.patient.nom,
          prenom: result.patient.prenom,
          email: result.patient.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur POST patient/comptes:', error)
    return NextResponse.json(
      { error: "Erreur lors de la création du compte patient" },
      { status: 500 }
    )
  }
}

// GET: Get patient profile by email
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Le paramètre email est requis' },
        { status: 400 }
      )
    }

    const utilisateur = await db.utilisateur.findUnique({
      where: { email },
      include: {
        patients: true,
      },
    })

    if (!utilisateur || utilisateur.role !== 'PATIENT') {
      return NextResponse.json(
        { error: 'Compte patient non trouvé' },
        { status: 404 }
      )
    }

    const patient = utilisateur.patients[0]

    return NextResponse.json({
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        role: utilisateur.role,
        telephone: utilisateur.telephone,
        actif: utilisateur.actif,
      },
      patient: patient
        ? {
            id: patient.id,
            nom: patient.nom,
            prenom: patient.prenom,
            telephone: patient.telephone,
            email: patient.email,
            dateNaissance: patient.dateNaissance,
            sexe: patient.sexe,
            numeroAssurance: patient.numeroAssurance,
            assurance: patient.assurance,
            adresse: patient.adresse,
            pointsFidelite: patient.pointsFidelite,
            actif: patient.actif,
          }
        : null,
    })
  } catch (error) {
    console.error('Erreur GET patient/comptes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil patient' },
      { status: 500 }
    )
  }
}
