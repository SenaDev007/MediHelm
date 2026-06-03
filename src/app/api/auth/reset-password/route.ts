import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    // Find user by email
    const utilisateur = await db.utilisateur.findUnique({ where: { email } })

    if (!utilisateur) {
      // Don't reveal that the email doesn't exist
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      })
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

    // Store the token in the utilisateur record
    // We use a JSON field approach since we don't have a dedicated field
    // We'll store it as a temporary note in the utilisateur's record
    await db.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        // Store reset token in avatarUrl temporarily as a hack
        // In production, you'd add a dedicated resetToken/resetTokenExpiry field
        avatarUrl: `RESET_TOKEN:${resetToken}:${resetTokenExpiry.toISOString()}`,
      },
    })

    // In production, send email here
    // For demo mode, return the token in the response
    return NextResponse.json({
      success: true,
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      // Demo mode: expose the token
      _demoToken: resetToken,
      _demoEmail: email,
    })
  } catch (error) {
    console.error('Erreur reset-password:', error)
    return NextResponse.json({ error: 'Erreur lors de la demande de réinitialisation' }, { status: 500 })
  }
}
