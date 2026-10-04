// ============================================================
// MediHelm — Push Notifications (Firebase Cloud Messaging)
// Notifications push — alertes DPMED, rappels, commandes
// Référence: MH-SPECS-2025-v2.0
// ============================================================

const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY || ''
const FCM_URL = 'https://fcm.googleapis.com/fcm/send'

export interface PushNotification {
  title: string
  body: string
  token?: string
  tokens?: string[]
  data?: Record<string, string>
  clickAction?: string
}

export async function sendPushNotification(params: PushNotification): Promise<{ success: number; failed: number }> {
  if (!FIREBASE_SERVER_KEY) {
    console.log('[Push] Mode développement — push non envoyé:', params.title)
    return { success: 1, failed: 0 }
  }

  const tokens = params.tokens || (params.token ? [params.token] : [])
  if (tokens.length === 0) {
    // No specific tokens — send topic notification
    try {
      const response = await fetch(FCM_URL, {
        method: 'POST',
        headers: {
          'Authorization': `key=${FIREBASE_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: '/topics/dpmed-alerts',
          notification: {
            title: params.title,
            body: params.body,
            click_action: params.clickAction,
            icon: '/logo-MediHelm-01.png',
            sound: 'default',
          },
          data: params.data || {},
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return { success: data.success || 1, failed: data.failure || 0 }
      }
      return { success: 0, failed: 1 }
    } catch (error) {
      console.error('[Push] Topic notification error:', error)
      return { success: 0, failed: 1 }
    }
  }

  try {
    // Batch in groups of 500 (FCM limit)
    let success = 0
    let failed = 0

    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500)

      const response = await fetch(FCM_URL, {
        method: 'POST',
        headers: {
          'Authorization': `key=${FIREBASE_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_ids: batch,
          notification: {
            title: params.title,
            body: params.body,
            click_action: params.clickAction,
            icon: '/logo-MediHelm-01.png',
            sound: 'default',
          },
          data: params.data || {},
        }),
      })

      if (response.ok) {
        const data = await response.json()
        success += data.success || 0
        failed += data.failure || 0
      } else {
        failed += batch.length
      }
    }

    return { success, failed }
  } catch (error) {
    console.error('[Push] Error:', error)
    return { success: 0, failed: tokens.length }
  }
}
