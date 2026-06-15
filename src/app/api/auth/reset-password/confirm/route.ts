// ============================================================
// MédiHelm — Confirmation de réinitialisation de mot de passe
// POST /api/auth/reset-password/confirm
// Valide le token et met à jour le mot de passe
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // 1. Parser le corps de la requête
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide' },
        { status: 400 }
      )
    }

    const { token, newPassword } = body as { token?: string; newPassword?: string }

    // 2. Valider les champs obligatoires
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token et nouveau mot de passe sont obligatoires' },
        { status: 400 }
      )
    }

    // 3. Valider la complexité du mot de passe
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      )
    }

    // 4. Chercher le token dans les audit logs (approche simplifiée)
    const resetLog = await db.auditLog.findFirst({
      where: {
        action: 'PASSWORD_RESET_REQUESTED',
        details: { contains: token },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!resetLog) {
      return NextResponse.json(
        { error: 'Token de réinitialisation invalide ou expiré' },
        { status: 400 }
      )
    }

    // 5. Vérifier que le token n'a pas expiré (1h)
    const details = JSON.parse(resetLog.details || '{}') as {
      tokenExpiry?: string
      resetToken?: string
    }

    if (!details.tokenExpiry || new Date(details.tokenExpiry) < new Date()) {
      return NextResponse.json(
        { error: 'Token de réinitialisation expiré. Veuillez faire une nouvelle demande.' },
        { status: 400 }
      )
    }

    // 6. Vérifier que le token correspond exactement
    if (details.resetToken !== token) {
      return NextResponse.json(
        { error: 'Token de réinitialisation invalide' },
        { status: 400 }
      )
    }

    // 7. Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // 8. Mettre à jour le mot de passe de l'utilisateur
    await db.utilisateur.update({
      where: { id: resetLog.userId! },
      data: { motDePasse: hashedPassword },
    })

    // 9. Journaliser la réinitialisation
    await db.auditLog.create({
      data: {
        userId: resetLog.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        entity: 'Utilisateur',
        entityId: resetLog.userId!,
        details: JSON.stringify({ completedAt: new Date().toISOString() }),
      },
    })

    return NextResponse.json(
      { message: 'Mot de passe réinitialisé avec succès' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Erreur confirmation réinitialisation mot de passe:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe' },
      { status: 500 }
    )
  }
}
