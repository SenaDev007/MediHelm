// ============================================================
// MédiHelm — Utilitaires de validation HMAC pour les webhooks
// Validation des signatures HMAC-SHA256 pour les webhooks entrants
// ============================================================

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Valide la signature HMAC-SHA256 d'un webhook entrant
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
