// ============================================================
// MediHelm — SMS Service (Africa's Talking)
// SMS nationaux — alertes DPMED, rappels, campagnes
// Référence: MH-SPECS-2025-v2.0
// ============================================================

const AFRICAS_TALKING_API_KEY = process.env.AFRICAS_TALKING_API_KEY || ''
const AFRICAS_TALKING_USERNAME = process.env.AFRICAS_TALKING_USERNAME || 'sandbox'
const AFRICAS_TALKING_API_URL = process.env.AFRICAS_TALKING_API_URL || 'https://api.africastalking.com/v1/messaging'

export interface SMSParams {
  to: string | string[]
  message: string
  from?: string
}

export async function sendSMS(params: SMSParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!AFRICAS_TALKING_API_KEY) {
    console.log('[SMS] Mode développement — SMS non envoyé:', params.message.substring(0, 50), params.to)
    return { success: true, messageId: `dev_${Date.now()}` }
  }

  try {
    const phones = Array.isArray(params.to) ? params.to : [params.to]

    const response = await fetch(AFRICAS_TALKING_API_URL, {
      method: 'POST',
      headers: {
        'ApiKey': AFRICAS_TALKING_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        username: AFRICAS_TALKING_USERNAME,
        to: phones.join(','),
        message: params.message,
        from: params.from || 'MediHelm',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Africa's Talking API error: ${response.status} - ${error}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.SMSMessageData?.Recipients?.[0]?.messageId }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

/**
 * Send bulk SMS for DPMED alerts
 * Respects batch limit of 500 recipients
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string,
  from?: string
): Promise<{ sent: number; failed: number }> {
  if (!AFRICAS_TALKING_API_KEY) {
    console.log(`[SMS] Mode développement — ${recipients.length} SMS non envoyés`)
    return { sent: recipients.length, failed: 0 }
  }

  let sent = 0
  let failed = 0

  // Batch in groups of 500
  for (let i = 0; i < recipients.length; i += 500) {
    const batch = recipients.slice(i, i + 500)
    const result = await sendSMS({ to: batch, message, from })
    if (result.success) {
      sent += batch.length
    } else {
      failed += batch.length
      console.error('[SMS] Batch failed:', result.error)
    }
  }

  return { sent, failed }
}
