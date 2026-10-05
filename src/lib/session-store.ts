// ============================================================
// MediHelm — Persistance des sessions d'authentification en base
//
// Complément serveur de la stratégie JWT NextAuth : chaque connexion
// crée un enregistrement SessionUtilisateur (lié au claim jti du JWT),
// chaque appel API le vérifie, chaque déconnexion le révoque.
//
// Garanties apportées :
//   • une session peut être révoquée immédiatement côté serveur ;
//   • l'état « connecté » est vérifiable en base, pas seulement par
//     la signature du cookie ;
//   • l'audit des sessions (création / dernier accès / révocation).
// ============================================================

import { db } from '@/lib/db'

/** Durée de vie d'une session (alignée sur session.maxAge de NextAuth : 24 h). */
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

/** Tolérance de fraîcheur avant mise à jour de « dernierAcces » (limite les écritures). */
const LAST_ACCESS_THRESHOLD_MS = 60 * 1000

export interface CreatedSession {
  id: string
}

/**
 * Crée l'enregistrement de session en base à la connexion.
 * @param utilisateurId ID de l'utilisateur qui se connecte
 * @param jti Identifiant unique du JWT NextAuth
 * @param roleSnapshot Rôle au moment de la connexion
 */
export async function createDbSession(
  utilisateurId: string,
  jti: string,
  roleSnapshot: string
): Promise<CreatedSession> {
  // Une éventuelle session précédente portant le même jti (reconnexion
  // rapide, rejeu) est remplacée — un jti ne peut exister qu'actif une fois.
  const session = await db.sessionUtilisateur.upsert({
    where: { jeton: jti },
    create: {
      utilisateurId,
      jeton: jti,
      roleSnapshot,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
    update: {
      utilisateurId,
      roleSnapshot,
      revokedAt: null,
      dernierAcces: new Date(),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
    select: { id: true },
  })
  return session
}

export interface DbSessionValidity {
  valid: boolean
  /** Vrai si « dernierAcces » a été rafraîchi lors de cette vérification. */
  refreshed: boolean
}

// ─── Cache local de validité (routes API) ────────────────────────────────
// Une vérification en base PAR requête API serait excessive pour les pages
// « bavardes » (dashboard = 10+ appels). Le verdict est mis en cache pendant
// SESSION_CACHE_TTL ms — TOUTE révocation invalide immédiatement l'entrée :
// la propagation d'une déconnexion est donc instantanée dans le processus.
// Le cache vit sur globalThis : en dev, chaque route peut recevoir sa propre
// instance du module (même raison que le singleton PrismaClient) — sans cela,
// l'invalidation faite par la route de déconnexion ne toucherait pas le
// cache lu par les routes API.
const SESSION_CACHE_TTL_MS = 30 * 1000

const globalForSessionCache = globalThis as unknown as {
  __medihelmSessionCache?: Map<string, { valid: boolean; at: number }>
}

const sessionValidityCache: Map<string, { valid: boolean; at: number }> =
  globalForSessionCache.__medihelmSessionCache ?? new Map()
globalForSessionCache.__medihelmSessionCache = sessionValidityCache

function invalidateSessionCacheEntry(sessionId: string): void {
  sessionValidityCache.delete(sessionId)
}

/** Validation avec cache court — utilisée par les routes API. */
export async function validateDbSessionCached(
  sessionId: string | null | undefined,
  utilisateurId: string | null | undefined
): Promise<boolean> {
  if (!sessionId || !utilisateurId) return false
  const cached = sessionValidityCache.get(sessionId)
  if (cached && Date.now() - cached.at < SESSION_CACHE_TTL_MS) return cached.valid
  const { valid } = await validateDbSession(sessionId, utilisateurId)
  sessionValidityCache.set(sessionId, { valid, at: Date.now() })
  if (sessionValidityCache.size > 5000) {
    // Hygiène : purge des entrées expirées (fuite mémoire impossible)
    const cutoff = Date.now() - SESSION_CACHE_TTL_MS
    for (const [key, entry] of sessionValidityCache) {
      if (entry.at < cutoff) sessionValidityCache.delete(key)
    }
  }
  return valid
}

/**
 * Vérifie qu'une session en base est active : existante, non révoquée,
 * non expirée, et appartenant bien à l'utilisateur annoncé.
 */
export async function validateDbSession(
  sessionId: string | null | undefined,
  utilisateurId: string | null | undefined
): Promise<DbSessionValidity> {
  if (!sessionId || !utilisateurId) return { valid: false, refreshed: false }

  const session = await db.sessionUtilisateur.findUnique({
    where: { id: sessionId },
    select: { id: true, utilisateurId: true, revokedAt: true, expiresAt: true, dernierAcces: true },
  })

  if (
    !session ||
    session.revokedAt !== null ||
    session.expiresAt.getTime() <= Date.now() ||
    session.utilisateurId !== utilisateurId
  ) {
    return { valid: false, refreshed: false }
  }

  // Rafraîchit « dernierAcces » au plus une fois par minute.
  if (Date.now() - session.dernierAcces.getTime() > LAST_ACCESS_THRESHOLD_MS) {
    try {
      await db.sessionUtilisateur.update({
        where: { id: sessionId },
        data: { dernierAcces: new Date() },
        select: { id: true },
      })
    } catch {
      // Non bloquant : l'échec de la métrique d'accès n'invalide pas la session
    }
    return { valid: true, refreshed: true }
  }
  return { valid: true, refreshed: false }
}

/**
 * Révoque une session (déconnexion) — la ligne reste en base pour l'audit.
 * L'entrée de cache locale est INVALIDÉE immédiatement : les requêtes API
 * suivantes de ce process rejettent le cookie tout de suite.
 */
export async function revokeDbSession(sessionId: string | null | undefined): Promise<void> {
  if (!sessionId) return
  try {
    await db.sessionUtilisateur.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  } catch {
    // La révocation échoue (base indisponible) : le JWT expirera de lui-même
  } finally {
    invalidateSessionCacheEntry(sessionId)
  }
}

/**
 * Révoque toutes les sessions actives d'un utilisateur (changement de mot
 * de passe, désactivation de compte…). Retourne le nombre révoqué.
 */
export async function revokeAllUserSessions(utilisateurId: string): Promise<number> {
  // Récupère les ids d'abord pour invalider leurs entrées de cache
  const active = await db.sessionUtilisateur.findMany({
    where: { utilisateurId, revokedAt: null },
    select: { id: true },
  })
  const result = await db.sessionUtilisateur.updateMany({
    where: { utilisateurId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  for (const s of active) invalidateSessionCacheEntry(s.id)
  return result.count
}

/**
 * Purge les sessions expirées de plus de 30 jours (hygiène de la table).
 * Sans danger : les lignes révoquées/expirées ne servent qu'à l'audit.
 */
export async function purgeStaleSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const result = await db.sessionUtilisateur.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  })
  return result.count
}
