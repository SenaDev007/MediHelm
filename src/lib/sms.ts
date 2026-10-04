// ============================================================
// MediHelm — SMS Integration (AfricasTalking)
// SMS gateway for Bénin: notifications, rappels, campagnes
// Référence: MH-SPECS-2025-v2.0 — Communications
// ============================================================

const AFRICAS_TALKING_API_KEY = process.env.AFRICAS_TALKING_API_KEY || ''
const AFRICAS_TALKING_USERNAME = process.env.AFRICAS_TALKING_USERNAME || 'sandbox'
const AFRICAS_TALKING_BASE_URL = process.env.AFRICAS_TALKING_ENV === 'production'
  ? 'https://api.africastalking.com/v1'
  : 'https://api.sandbox.africastalking.com/v1'

const AFRICAS_TALKING_SENDER = process.env.AFRICAS_TALKING_SENDER || 'MediHelm'

export interface SmsMessage {
  to: string | string[]
  message: string
  from?: string
}

export interface SmsResult {
  success: boolean
  messageId?: string
  cost?: string
  error?: string
  recipients?: number
}

/**
 * Send a single SMS
 */
export async function sendSms(sms: SmsMessage): Promise<SmsResult> {
  if (!AFRICAS_TALKING_API_KEY) {
    console.warn('[SMS] Clé API AfricasTalking non configurée — mode simulation')
    return simulateSms(sms)
  }

  try {
    const recipients = Array.isArray(sms.to) ? sms.to : [sms.to]

    const response = await fetch(`${AFRICAS_TALKING_BASE_URL}/messaging`, {
      method: 'POST',
      headers: {
        'ApiKey': AFRICAS_TALKING_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        username: AFRICAS_TALKING_USERNAME,
        to: recipients.join(','),
        message: sms.message,
        from: sms.from || AFRICAS_TALKING_SENDER,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return { success: false, error: error.SMSMessageData?.Message || 'Erreur envoi SMS' }
    }

    const result = await response.json()
    const data = result.SMSMessageData

    return {
      success: data.Recipients?.length > 0,
      messageId: data.Recipients?.[0]?.messageId,
      cost: data.Recipients?.[0]?.cost,
      recipients: data.Recipients?.length || 0,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

/**
 * Send bulk SMS (campaign)
 */
export async function sendBulkSms(
  recipients: string[],
  message: string
): Promise<SmsResult> {
  if (recipients.length > 1000) {
    // Batch in chunks of 1000
    const results: SmsResult[] = []
    for (let i = 0; i < recipients.length; i += 1000) {
      const chunk = recipients.slice(i, i + 1000)
      results.push(await sendSms({ to: chunk, message }))
    }
    const totalSuccess = results.filter(r => r.success).length
    return {
      success: totalSuccess > 0,
      recipients: totalSuccess,
      error: totalSuccess < results.length ? `${results.length - totalSuccess} lots échoués` : undefined,
    }
  }

  return sendSms({ to: recipients, message })
}

/**
 * Simulate SMS (for development without API key)
 */
function simulateSms(sms: SmsMessage): SmsResult {
  const recipients = Array.isArray(sms.to) ? sms.to : [sms.to]
  console.log(`[SMS SIM] To: ${recipients.join(', ')} — ${sms.message}`)
  return {
    success: true,
    messageId: `sim-${Date.now()}`,
    cost: '0',
    recipients: recipients.length,
  }
}

/**
 * Send appointment/vaccination reminder SMS
 */
export async function sendRappelSms(
  phone: string,
  patientName: string,
  type: 'vaccination' | 'ordonnance' | 'garde',
  details: { date?: string; pharmacie?: string; vaccin?: string }
): Promise<SmsResult> {
  let message: string

  switch (type) {
    case 'vaccination':
      message = `MédiHelm: Rappel - ${patientName}, votre vaccination${details.vaccin ? ` (${details.vaccin})` : ''} est prévue${details.date ? ` le ${details.date}` : ''}. ${details.pharmacie || ''}`
      break
    case 'ordonnance':
      message = `MédiHelm: ${patientName}, votre ordonnance est prête${details.pharmacie ? ` à ${details.pharmacie}` : ''}. Merci de passer la récupérer.`
      break
    case 'garde':
      message = `MédiHelm: Pharmacie de garde${details.pharmacie ? ` - ${details.pharmacie}` : ''}${details.date ? ` le ${details.date}` : ''}. Restez en bonne santé!`
      break
    default:
      message = `MédiHelm: Rappel pour ${patientName}. ${details.date || ''}`
  }

  return sendSms({ to: phone, message })
}

// ============================================================
// Legacy interface compatibility (existing code may import these)
// ============================================================

export interface SMSParams {
  to: string | string[]
  message: string
  from?: string
}

export async function sendSMS(params: SMSParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const result = await sendSms({ to: params.to, message: params.message, from: params.from })
  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  }
}

export async function sendBulkSMS(
  recipients: string[],
  message: string,
  from?: string
): Promise<{ sent: number; failed: number }> {
  const result = await sendBulkSms(recipients, message)
  if (result.success) {
    return { sent: result.recipients || recipients.length, failed: 0 }
  }
  return { sent: 0, failed: recipients.length }
}
