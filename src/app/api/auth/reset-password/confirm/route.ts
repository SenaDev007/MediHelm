import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { token, email, newPassword } = await request.json()

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: 'Token, email et nouveau mot de passe requis' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Find user by email
    const utilisateur = await db.utilisateur.findUnique({ where: { email } })

    if (!utilisateur) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 })
    }

    // Verify the token stored in avatarUrl
    if (!utilisateur.avatarUrl || !utilisateur.avatarUrl.startsWith('RESET_TOKEN:')) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 })
    }

    const parts = utilisateur.avatarUrl.split(':')
    // Format: RESET_TOKEN:{token}:{expiry}
    const storedToken = parts[1]
    const expiryStr = parts.slice(2).join(':') // In case ISO date has colons

    if (storedToken !== token) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 })
    }

    const expiry = new Date(expiryStr)
    if (expiry < new Date()) {
      return NextResponse.json({ error: 'Token expiré' }, { status: 400 })
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    // Update the user's password and clear the reset token
    await db.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        motDePasse: hashedPassword,
        avatarUrl: null, // Clear the reset token
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    })
  } catch (error) {
    console.error('Erreur reset-password confirm:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe' },
      { status: 500 }
    )
  }
}
