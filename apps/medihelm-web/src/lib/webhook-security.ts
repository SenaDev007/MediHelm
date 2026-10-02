// ============================================================
// MediHelm — Utilitaires de validation HMAC pour les webhooks
// Validation des signatures HMAC-SHA256 pour les webhooks entrants
// Supports: DPMED, UbiPharm, Promopharma, SoBAPS
// Référence: MH-SPECS-2025-v2.0 — Sécurité Webhooks
// ============================================================

import { createHmac, timingSafeEqual } from 'crypto'
import { verifyWebhookHMAC, getWebhookSignature, isIPWhitelisted, getClientIP } from './webhook-hmac'

/**
 * Valide la signature HMAC-SHA256 d'un webhook entrant (legacy interface)
 *
 * Le processus de validation :
 * 1. Lire le body brut de la requête
 * 2. Calculer le HMAC-SHA256 du body avec le secret partagé
 * 3. Comparer avec la signature envoyée dans l'en-tête x-medihelm-signature
 * 4. Utiliser une comparaison en temps constant pour éviter les attaques par timing
 *
 * @param body - Body brut de la requête (string ou Buffer)
 * @param signature - Signature reçue dans l'en-tête x-medihelm-signature
 * @param secret - Secret partagé pour le calcul du HMAC
 * @returns true si la signature est valide, false sinon
 */
export function validateHmacSignature(
  body: string | Buffer,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false
  }

  // Calculer le HMAC-SHA256 du body avec le secret
  const expectedSignature = createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  // Préfixer avec "sha256=" si la signature attendue l'utilise
  const expectedWithPrefix = `sha256=${expectedSignature}`

  // Comparaison en temps constant pour éviter les attaques par timing
  try {
    // Essayer d'abord avec le format "sha256=..."
    if (signature.startsWith('sha256=')) {
      return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedWithPrefix)
      )
    }

    // Sinon, comparer directement les hex
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    // Les buffers ont des tailles différentes — signature invalide
    return false
  }
}

/**
 * Extrait le body brut d'une requête et valide sa signature HMAC
 * (legacy interface — uses x-medihelm-signature header)
 *
 * @param request - Requête HTTP entrante
 * @param secretEnvVar - Nom de la variable d'environnement contenant le secret
 * @returns Objet avec le body parsé ou une erreur
 */
export async function validateWebhookRequest<T = Record<string, unknown>>(
  request: Request,
  secretEnvVar: string
): Promise<{ body: T; valid: true } | { error: string; valid: false; status: number }> {
  // Récupérer le secret depuis l'environnement
  const secret = process.env[secretEnvVar]

  if (!secret) {
    console.error(`Secret webhook non configuré: ${secretEnvVar}`)
    return {
      error: 'Configuration serveur incomplète',
      valid: false,
      status: 500,
    }
  }

  // Lire le body brut
  const rawBody = await request.text()

  // Récupérer la signature de l'en-tête
  const signature = request.headers.get('x-medihelm-signature')

  // Valider la signature HMAC
  if (!validateHmacSignature(rawBody, signature, secret)) {
    console.warn('Signature HMAC invalide pour le webhook', {
      path: request.url,
      hasSignature: !!signature,
    })
    return {
      error: 'Signature invalide',
      valid: false,
      status: 403,
    }
  }

  // Parser le body JSON
  try {
    const body = JSON.parse(rawBody) as T
    return { body, valid: true }
  } catch {
    return {
      error: 'Body JSON invalide',
      valid: false,
      status: 400,
    }
  }
}

/**
 * Validate a webhook request using per-source HMAC verification
 * Supports: dpmed, ubipharm, promopharma, sobaps
 *
 * This is the enhanced interface that uses source-specific headers and secrets.
 *
 * @param request - Requête HTTP entrante
 * @param source - Source du webhook (dpmed, ubipharm, promopharma, sobaps)
 * @returns Objet avec le body brut et parsé, ou une erreur
 */
export async function validateSourceWebhookRequest<T = Record<string, unknown>>(
  request: Request,
  source: string
): Promise<{
  rawBody: string
  body: T
  clientIp: string
  valid: true
} | {
  error: string
  code?: string
  valid: false
  status: number
}> {
  // 1. Read raw body
  const rawBody = await request.text()

  // 2. Extract client IP and check whitelist
  const clientIp = getClientIP(request)
  if (!isIPWhitelisted(source, clientIp)) {
    console.warn(`[Webhook Security] IP non autorisée pour ${source}: ${clientIp}`)
    return {
      error: `IP ${clientIp} non autorisée`,
      code: 'MH-SEC-002',
      valid: false,
      status: 403,
    }
  }

  // 3. Extract signature from source-specific header
  const signature = getWebhookSignature(request, source)
  if (!signature) {
    console.warn(`[Webhook Security] Signature manquante pour ${source}`)
    return {
      error: 'Signature manquante',
      code: 'MH-SEC-001',
      valid: false,
      status: 401,
    }
  }

  // 4. Verify HMAC-SHA256 signature
  if (!verifyWebhookHMAC(source, rawBody, signature)) {
    console.warn(`[Webhook Security] Signature HMAC invalide pour ${source}`)
    return {
      error: 'Signature invalide',
      code: 'MH-SEC-001',
      valid: false,
      status: 401,
    }
  }

  // 5. Parse body JSON
  try {
    const body = JSON.parse(rawBody) as T
    return { rawBody, body, clientIp, valid: true }
  } catch {
    return {
      error: 'Body JSON invalide',
      valid: false,
      status: 400,
    }
  }
}

// Re-export from webhook-hmac for convenience
export { verifyWebhookHMAC, getWebhookSignature, isIPWhitelisted, getClientIP } from './webhook-hmac'
