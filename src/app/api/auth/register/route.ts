import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { validate, loginSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.AUTH_REGISTER)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()

    // Zod validation for basic auth fields
    const validation = validate(loginSchema, { email: body.email, motDePasse: body.motDePasse })
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.flatten() },
        { status: 400 }
      )
    }

    const { pharmacieId, email, motDePasse, nom, prenom, telephone, roleName } = body

    if (!pharmacieId || !nom || !prenom) {
      return NextResponse.json(
        { error: 'pharmacieId, nom et prenom requis' },
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

    // Hash the password
    const hashedPassword = await hashPassword(motDePasse)

    // Create the user — role is a simple string field in SQLite schema
    const utilisateur = await db.utilisateur.create({
      data: {
        pharmacieId,
        email,
        motDePasse: hashedPassword,
        nom,
        prenom,
        role: roleName || 'PHARMACIEN',
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
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
