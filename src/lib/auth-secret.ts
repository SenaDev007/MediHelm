// ============================================================
// MediHelm — Résolution du secret NextAuth (runtime Node.js)
// ============================================================
// CONTEXTE : si NEXTAUTH_SECRET n'est pas configuré sur
// l'hébergeur (Vercel), NextAuth v4 en production refuse TOUTES
// les routes /api/auth/* avec l'erreur « MissingSecret » (HTTP
// 500 « There is a problem with the server configuration ») —
// la connexion devient impossible alors que l'inscription
// (route API classique) fonctionne.
//
// STRATÉGIE : NEXTAUTH_SECRET > AUTH_SECRET > valeur DÉRIVÉE de
// la chaîne de connexion base de données (déjà secrète et propre
// à chaque déploiement). La dérivation est déterministe : les
// routes API (signature du JWT) et le middleware Edge
// (vérification — voir auth-secret-edge.ts) calculent
// exactement la même valeur.
//
// NOTE : configurer explicitement NEXTAUTH_SECRET dans les
// variables d'environnement Vercel reste la bonne pratique
// (rotation indépendante du secret sans changer la base).
//
// ⚠️ Runtime NODE UNIQUEMENT (import statique de node:crypto) —
// le middleware Edge utilise auth-secret-edge.ts. Toute
// modification du sel ou de l'algorithme doit être répercutée
// dans les DEUX fichiers.
// ============================================================

import { createHash } from 'node:crypto'
import { DERIVATION_SALT } from './auth-secret-salt'

/** Résolution SYNCHRONE (routes API — src/lib/auth.ts). */
export function resolveAuthSecret(): string | undefined {
  const explicit = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (explicit) return explicit
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl) {
    return createHash('sha256')
      .update(`${DERIVATION_SALT}${dbUrl}`)
      .digest('hex')
  }
  return undefined
}
