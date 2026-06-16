// ============================================================
// MediHelm — Email Service (Resend)
// Emails transactionnels
// Référence: MH-SPECS-2025-v2.0
// ============================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@medihelm.com'

export interface EmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.log('[Email] Mode développement — email non envoyé:', params.subject, params.to)
    return { success: true, id: `dev_${Date.now()}` }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `MediHelm <${FROM_EMAIL}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Resend API error: ${response.status} - ${error}` }
    }

    const data = await response.json()
    return { success: true, id: data.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

// Email templates
export function passwordResetEmail(nom: string, resetUrl: string) {
  return {
    subject: 'MediHelm — Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1D9E75; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MediHelm</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${nom},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <a href="${resetUrl}" style="background: #1D9E75; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
            Réinitialiser mon mot de passe
          </a>
          <p style="color: #666; font-size: 12px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        </div>
      </div>
    `,
    text: `Bonjour ${nom},\n\nRéinitialisez votre mot de passe: ${resetUrl}\n\nCe lien expire dans 1 heure.`,
  }
}

export function welcomeEmail(nom: string, pharmacieNom: string) {
  return {
    subject: `Bienvenue sur MediHelm — ${pharmacieNom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1D9E75; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Bienvenue sur MediHelm</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${nom},</p>
          <p>Votre pharmacie <strong>${pharmacieNom}</strong> a été créée sur MediHelm.</p>
          <p>Vous pouvez maintenant accéder à votre espace professionnel et commencer à utiliser les 19 modules de la plateforme.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://medihelm.com'}/pro" style="background: #1D9E75; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
            Accéder à mon espace
          </a>
        </div>
      </div>
    `,
    text: `Bonjour ${nom},\n\nVotre pharmacie ${pharmacieNom} a été créée sur MediHelm.\nAccédez à votre espace: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://medihelm.com'}/pro`,
  }
}

export function alerteDPMEDEmail(nom: string, alerteTitre: string, alerteDescription: string) {
  return {
    subject: `ALERTE DPMED — ${alerteTitre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #DC2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">⚠️ Alerte DPMED</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${nom},</p>
          <p><strong>${alerteTitre}</strong></p>
          <p>${alerteDescription}</p>
          <p style="color: #DC2626; font-weight: bold;">Veuillez traiter cette alerte dans les plus brefs délais.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://medihelm.com'}/pro/alertes" style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
            Voir l'alerte
          </a>
        </div>
      </div>
    `,
    text: `Bonjour ${nom},\n\nALERTE DPMED: ${alerteTitre}\n${alerteDescription}\n\nVeuillez traiter cette alerte dans les plus brefs délais.`,
  }
}
