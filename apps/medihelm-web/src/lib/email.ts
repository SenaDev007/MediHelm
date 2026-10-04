// ============================================================
// MediHelm — Email Integration (SMTP / Resend)
// Transactional emails: welcome, invoice, alert, reset password
// Référence: MH-SPECS-2025-v2.0 — Communications Email
// ============================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const RESEND_BASE_URL = 'https://api.resend.com'
const EMAIL_FROM = process.env.EMAIL_FROM || 'MediHelm <noreply@medihelm.bj>'

export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email via Resend API
 */
export async function sendEmail(email: EmailMessage): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] Clé Resend non configurée — mode simulation')
    return simulateEmail(email)
  }

  try {
    const response = await fetch(`${RESEND_BASE_URL}/email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        cc: email.cc,
        bcc: email.bcc,
        reply_to: email.replyTo,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return { success: false, error: error.message || 'Erreur envoi email' }
    }

    const result = await response.json()
    return { success: true, messageId: result.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

/**
 * Send welcome email to new pharmacy
 */
export async function sendWelcomeEmail(
  to: string,
  nomPharmacie: string,
  plan: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Bienvenue sur MédiHelm — ${nomPharmacie}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0ea5e9; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">MédiHelm</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc; border-radius: 0 0 8px 8px;">
          <h2>Bienvenue ${nomPharmacie} !</h2>
          <p>Votre pharmacie est maintenant inscrite sur MédiHelm avec le plan <strong>${plan}</strong>.</p>
          <p>Vous pouvez dès maintenant accéder à votre tableau de bord professionnel et commencer à gérer votre pharmacie.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/connexion" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0;">
            Se connecter
          </a>
          <p style="color: #64748b; font-size: 14px;">L'équipe MédiHelm — La pharmacie digitale du Bénin</p>
        </div>
      </div>
    `,
  })
}

/**
 * Send password reset email
 */
export async function sendResetPasswordEmail(
  to: string,
  resetToken: string
): Promise<EmailResult> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/mot-de-passe-oublie?token=${resetToken}`

  return sendEmail({
    to,
    subject: 'MédiHelm — Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0ea5e9; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">MédiHelm</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc; border-radius: 0 0 8px 8px;">
          <h2>Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0;">
            Réinitialiser le mot de passe
          </a>
          <p style="color: #64748b; font-size: 14px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        </div>
      </div>
    `,
  })
}

/**
 * Simulate email (development mode)
 */
function simulateEmail(email: EmailMessage): EmailResult {
  const recipients = Array.isArray(email.to) ? email.to.join(', ') : email.to
  console.log(`[Email SIM] To: ${recipients} — ${email.subject}`)
  return { success: true, messageId: `sim-${Date.now()}` }
}

// ============================================================
// Legacy interface compatibility (existing code may import these)
// ============================================================

export interface EmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export function passwordResetEmail(nom: string, resetUrl: string) {
  return {
    subject: 'MédiHelm — Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0ea5e9; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">MédiHelm</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc; border-radius: 0 0 8px 8px;">
          <p>Bonjour ${nom},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0;">
            Réinitialiser mon mot de passe
          </a>
          <p style="color: #64748b; font-size: 14px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        </div>
      </div>
    `,
    text: `Bonjour ${nom},\n\nRéinitialisez votre mot de passe: ${resetUrl}\n\nCe lien expire dans 1 heure.`,
  }
}

export function welcomeEmail(nom: string, pharmacieNom: string) {
  return {
    subject: `Bienvenue sur MédiHelm — ${pharmacieNom}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0ea5e9; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Bienvenue sur MédiHelm</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc; border-radius: 0 0 8px 8px;">
          <p>Bonjour ${nom},</p>
          <p>Votre pharmacie <strong>${pharmacieNom}</strong> a été créée sur MédiHelm.</p>
          <p>Vous pouvez maintenant accéder à votre espace professionnel et commencer à utiliser les 19 modules de la plateforme.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://medihelm.com'}/pro" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0;">
            Accéder à mon espace
          </a>
        </div>
      </div>
    `,
    text: `Bonjour ${nom},\n\nVotre pharmacie ${pharmacieNom} a été créée sur MédiHelm.\nAccédez à votre espace: ${process.env.NEXT_PUBLIC_APP_URL || 'https://medihelm.com'}/pro`,
  }
}

export function alerteDPMEDEmail(nom: string, alerteTitre: string, alerteDescription: string) {
  return {
    subject: `ALERTE DPMED — ${alerteTitre}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #DC2626; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">⚠️ Alerte DPMED</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc; border-radius: 0 0 8px 8px;">
          <p>Bonjour ${nom},</p>
          <p><strong>${alerteTitre}</strong></p>
          <p>${alerteDescription}</p>
          <p style="color: #DC2626; font-weight: bold;">Veuillez traiter cette alerte dans les plus brefs délais.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://medihelm.com'}/pro/alertes" style="display: inline-block; padding: 12px 24px; background: #DC2626; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0;">
            Voir l'alerte
          </a>
        </div>
      </div>
    `,
    text: `Bonjour ${nom},\n\nALERTE DPMED: ${alerteTitre}\n${alerteDescription}\n\nVeuillez traiter cette alerte dans les plus brefs délais.`,
  }
}
