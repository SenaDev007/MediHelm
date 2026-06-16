// ============================================================
// MediHelm — Webhook HMAC-SHA256 Verification
// Sécurité des webhooks institutionnels
// Référence: MH-SPECS-2025-v2.0
// ============================================================

import crypto from 'crypto'

export interface WebhookConfig {
  secret: string
  headerName: string
  algorithm?: string
}

const WEBHOOK_CONFIGS: Record<string, WebhookConfig> = {
  dpmed: {
    secret: process.env.DPMED_WEBHOOK_SECRET || '',
    headerName: 'x-dpmed-signature',
    algorithm: 'sha256',
  },
  ubipharm: {
    secret: process.env.UBIPHARM_WEBHOOK_SECRET || '',
    headerName: 'x-ubipharm-signature',
    algorithm: 'sha256',
  },
  promopharma: {
    secret: process.env.PROMOPHARMA_WEBHOOK_SECRET || '',
    headerName: 'x-promopharma-signature',
    algorithm: 'sha256',
  },
  sobaps: {
    secret: process.env.SOBAPS_WEBHOOK_SECRET || '',
    headerName: 'x-sobaps-signature',
    algorithm: 'sha256',
  },
}

/**
 * Verify webhook HMAC-SHA256 signature
 */
export function verifyWebhookHMAC(
  source: string,
  payload: string | Buffer,
  signature: string
): boolean {
  const config = WEBHOOK_CONFIGS[source]
  if (!config || !config.secret) {
    console.warn(`[Webhook HMAC] No secret configured for ${source}`)
    return true // Skip verification if no secret configured
  }

  const expected = crypto
    .createHmac(config.algorithm || 'sha256', config.secret)
    .update(payload)
    .digest('hex')

  try {
    // Support both raw hex and "sha256=..." prefixed formats
    if (signature.startsWith('sha256=')) {
      const expectedWithPrefix = `sha256=${expected}`
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedWithPrefix)
      )
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}

/**
 * Extract webhook signature from request headers
 */
export function getWebhookSignature(request: Request, source: string): string | null {
  const config = WEBHOOK_CONFIGS[source]
  if (!config) return null

  return request.headers.get(config.headerName) ||
    request.headers.get('x-signature') ||
    request.headers.get('x-webhook-secret') ||
    null
}

/**
 * Verify IP whitelist for webhook endpoints
 */
export function isIPWhitelisted(source: string, ip: string): boolean {
  const envKey = `${source.toUpperCase()}_IP_WHITELIST`
  const whitelist = process.env[envKey]

  if (!whitelist) return true // No whitelist configured = allow all

  const allowedIps = whitelist.split(',').map(ip => ip.trim())
  return allowedIps.includes(ip)
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}
