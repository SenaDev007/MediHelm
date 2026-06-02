import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, email, motDePasse, nom, prenom, telephone, roleName } = body

    if (!pharmacieId || !email || !motDePasse || !nom || !prenom) {
      return NextResponse.json(
        { error: 'pharmacieId, email, motDePasse, nom et prenom requis' },
        { status: 400 }
      )
    }

    if (motDePasse.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await db.utilisateur.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      )
    }

    // Find the role
    const role = await db.role.findUnique({ where: { nom: roleName || 'DIRECTEUR' } })
    if (!role) {
      return NextResponse.json(
        { error: `Rôle "${roleName || 'DIRECTEUR'}" non trouvé` },
        { status: 400 }
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(motDePasse)

    // Create the user
    const utilisateur = await db.utilisateur.create({
      data: {
        pharmacieId,
        email,
        motDePasse: hashedPassword,
        nom,
        prenom,
        telephone: telephone || null,
        roleId: role.id,
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: { select: { nom: true } },
      },
    })

    return NextResponse.json(utilisateur, { status: 201 })
  } catch (error) {
    console.error('Erreur POST register:', error)
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
