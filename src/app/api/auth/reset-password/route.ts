// ============================================================
// MediHelm — Demande de réinitialisation de mot de passe
// POST /api/auth/reset-password
// Accepte un email, génère un token de réinitialisation
// Retourne toujours 200 pour prévenir l'énumération d'emails
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.AUTH_RESET)
    if (rateLimitResponse) return rateLimitResponse

    // 1. Parser le corps de la requête
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' },
        { status: 200 }
      )
    }

    const { email } = body as { email?: string }

    // 2. Toujours retourner 200 pour prévenir l'énumération d'emails
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' },
        { status: 200 }
      )
    }

    // 3. Chercher l'utilisateur par email
    const utilisateur = await db.utilisateur.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!utilisateur || !utilisateur.actif) {
      // Ne pas révéler que l'utilisateur n'existe pas
      return NextResponse.json(
        { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' },
        { status: 200 }
      )
    }

    // 4. Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

    // 5. Stocker le token dans l'audit log (approche simplifiée)
    // En production, on utiliserait un modèle PasswordReset dédié et un email
    await db.auditLog.create({
      data: {
        userId: utilisateur.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entity: 'Utilisateur',
        entityId: utilisateur.id,
        details: JSON.stringify({
          resetToken,
          tokenExpiry: tokenExpiry.toISOString(),
          email: utilisateur.email,
        }),
      },
    })

    // 6. En production, envoyer l'email avec le lien de réinitialisation
    // Pour le moment, on retourne simplement le succès
    // L'email contiendrait : {BASE_URL}/reset-password?token={resetToken}

    return NextResponse.json(
      { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Erreur demande réinitialisation mot de passe:', error)
    // Toujours retourner 200 même en cas d'erreur interne
    return NextResponse.json(
      { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' },
      { status: 200 }
    )
  }
}
