// ============================================================
// MediHelm — Résolution du secret NextAuth (Edge Runtime)
// ============================================================
// Version Web Crypto du calcul de src/lib/auth-secret.ts pour
// le middleware (Edge Runtime, où node:crypto:createHash n'est
// pas disponible). Doit produire EXACTEMENT le même résultat :
// même sel, même algorithme SHA-256, même encodage hexadécimal.
//
// ⚠️ Toute modification doit être répercutée dans les DEUX
// fichiers (auth-secret.ts et auth-secret-edge.ts).
// ============================================================

import { DERIVATION_SALT } from './auth-secret-salt'

export async function resolveAuthSecretEdge(): Promise<string | undefined> {
  const explicit = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (explicit) return explicit
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${DERIVATION_SALT}${dbUrl}`),
    )
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return undefined
}
