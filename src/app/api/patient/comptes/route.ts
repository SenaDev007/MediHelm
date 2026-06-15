import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'

// POST: Register a new patient account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, motDePasse, nom, prenom, telephone, dateNaissance, sexe, numeroAssurance, assurance, adresse, pharmacieId } = body

    if (!email || !motDePasse || !nom || !prenom || !telephone) {
      return NextResponse.json(
        { error: 'Email, mot de passe, nom, prénom et téléphone sont obligatoires' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.utilisateur.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hash(motDePasse, 12)

    // Determine pharmacy — use provided or first active pharmacy
    let targetPharmacieId = pharmacieId
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
          email,
          nom,
          prenom,
          motDePasse: hashedPassword,
          role: 'PATIENT',
          telephone,
          pharmacieId: targetPharmacieId,
          actif: true,
        },
      })

      const patient = await tx.patient.create({
        data: {
          utilisateurId: utilisateur.id,
          pharmacieId: targetPharmacieId,
          nom,
          prenom,
          telephone,
          email,
          dateNaissance: dateNaissance ? new Date(dateNaissance) : null,
          sexe: sexe || null,
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
