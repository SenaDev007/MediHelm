import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telephone = searchParams.get('telephone')

    const where: Record<string, unknown> = {}
    if (telephone) where.telephone = telephone

    const data = await db.comptePatient.findMany({
      where,
      include: {
        patients: true,
        commandes: true,
        profilsFamille: true,
        vaccinations: { take: 5, orderBy: { dateVaccination: 'desc' } },
      },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET comptes patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle login action
    if (body.action === 'login') {
      const { telephone, motDePasse } = body
      if (!telephone || !motDePasse) {
        return NextResponse.json(
          { error: 'Téléphone et mot de passe requis' },
          { status: 400 }
        )
      }

      const compte = await db.comptePatient.findUnique({ where: { telephone } })
      if (!compte) {
        return NextResponse.json(
          { error: 'Identifiants invalides' },
          { status: 401 }
        )
      }

      // Verify password (support bcrypt and SHA-256 legacy)
      let valid = false
      if (compte.motDePasse.startsWith('$2a$') || compte.motDePasse.startsWith('$2b$')) {
        valid = await bcrypt.compare(motDePasse, compte.motDePasse)
      } else {
        // Legacy SHA-256 fallback
        const { createHash } = await import('crypto')
        const sha256Hash = createHash('sha256').update(motDePasse).digest('hex')
        valid = sha256Hash === compte.motDePasse
      }

      if (!valid) {
        return NextResponse.json(
          { error: 'Identifiants invalides' },
          { status: 401 }
        )
      }

      // Return the compte without the password
      const { motDePasse: _pw, ...safeCompte } = compte
      return NextResponse.json(safeCompte)
    }

    // Handle family member addition
    if (body.type === 'ADD_FAMILY') {
      const { comptePatientId, nom, prenom, lienParente, dateNaissance } = body
      if (!comptePatientId || !nom || !prenom || !lienParente || !dateNaissance) {
        return NextResponse.json(
          { error: 'comptePatientId, nom, prenom, lienParente et dateNaissance requis' },
          { status: 400 }
        )
      }
      const profil = await db.profilFamille.create({
        data: {
          comptePatientId,
          nom,
          prenom,
          lienParente,
          dateNaissance: new Date(dateNaissance),
        },
      })
      return NextResponse.json(profil, { status: 201 })
    }

    // Default: create a new ComptePatient (registration)
    const { nom, prenom, telephone, email, motDePasse } = body
    if (!nom || !prenom || !telephone || !motDePasse) {
      return NextResponse.json(
        { error: 'nom, prenom, telephone et motDePasse requis' },
        { status: 400 }
      )
    }

    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(motDePasse, 12)

    const data = await db.comptePatient.create({
      data: {
        nom,
        prenom,
        telephone,
        email: email || null,
        motDePasse: hashedPassword,
      },
    })

    // Return without the password
    const { motDePasse: _pw, ...safeCompte } = data
    return NextResponse.json(safeCompte, { status: 201 })
  } catch (error) {
    console.error('Erreur POST compte patient:', error)
    // Check for unique constraint violation on telephone
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Ce numéro de téléphone est déjà utilisé' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nom, prenom, email, adresse, dateNaissance, sexe, telephone } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (nom !== undefined) updateData.nom = nom
    if (prenom !== undefined) updateData.prenom = prenom
    if (email !== undefined) updateData.email = email
    if (adresse !== undefined) updateData.adresse = adresse
    if (dateNaissance !== undefined) updateData.dateNaissance = dateNaissance ? new Date(dateNaissance) : null
    if (sexe !== undefined) updateData.sexe = sexe
    if (telephone !== undefined) updateData.telephone = telephone

    const updated = await db.comptePatient.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH compte patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
