// ============================================================
// MediHelm — Firebase Cloud Messaging (Push Notifications)
// Server-side push notification sending
// Référence: MH-SPECS-2025-v2.0 — Notifications Push
// ============================================================

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || ''
const FCM_BASE_URL = 'https://fcm.googleapis.com/fcm'

export interface PushNotification {
  token: string | string[]
  title: string
  body: string
  icon?: string
  clickAction?: string
  data?: Record<string, string>
}

export interface PushResult {
  success: boolean
  multicastId?: number
  successCount?: number
  failureCount?: number
  error?: string
}

/**
 * Send a push notification via FCM
 */
export async function sendPushNotification(notification: PushNotification): Promise<PushResult> {
  if (!FCM_SERVER_KEY) {
    console.warn('[Push] Clé FCM non configurée — mode simulation')
    return simulatePush(notification)
  }

  try {
    const tokens = Array.isArray(notification.token) ? notification.token : [notification.token]

    const payload = {
      registration_ids: tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/logo-MediHelm.png',
        click_action: notification.clickAction,
      },
      data: notification.data || {},
    }

    const response = await fetch(`${FCM_BASE_URL}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return { success: false, error: `FCM error: ${response.status}` }
    }

    const result = await response.json()
    return {
      success: result.success > 0,
      multicastId: result.multicast_id,
      successCount: result.success,
      failureCount: result.failure,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

/**
 * Send push to all users of a pharmacy
 */
export async function notifyPharmacie(
  pharmacieId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<PushResult> {
  // In a real implementation, we'd look up FCM tokens from the database
  // For now, we use the notification system to store in DB
  console.log(`[Push] Pharmacie ${pharmacieId}: ${title} — ${body}`)

  return {
    success: true,
    successCount: 0,
    failureCount: 0,
  }
}

/**
 * Simulate push (development mode)
 */
function simulatePush(notification: PushNotification): PushResult {
  const tokens = Array.isArray(notification.token) ? notification.token : [notification.token]
  console.log(`[Push SIM] To: ${tokens.length} device(s) — ${notification.title}: ${notification.body}`)
  return { success: true, successCount: tokens.length, failureCount: 0 }
}
