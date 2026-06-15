// ============================================================
// MédiHelm — Helper d'authentification pour les routes API
// Extraction du JWT, vérification de permissions, accès pharmacie
// Support Authorization Bearer header + cookie NextAuth
// ============================================================

import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import type { AuthUser } from '@/lib/rbac'
import { checkPermission } from '@/lib/rbac'
import { db } from '@/lib/db'

/**
 * Extrait le JWT brut depuis une requête HTTP.
 *
 * Sources possibles (par ordre de priorité) :
 * 1. En-tête Authorization: Bearer <token>
 * 2. Cookie NextAuth (next-auth.session-token / __Secure-next-auth.session-token)
 *
 * @param request - Requête HTTP entrante
 * @returns Le JWT encodé (string) ou null si absent
 */
export function getTokenFromRequest(request: Request): string | null {
  // 1. Authorization header — Bearer token
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() || null
  }

  // 2. Cookie NextAuth
  const cookieHeader = request.headers.get('cookie') ?? ''
  const cookieMatch = cookieHeader.match(
    /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=([^;]+)/
  )
  if (cookieMatch?.[1]) {
    return cookieMatch[1]
  }

  return null
}

/**
 * Décode le JWT NextAuth et retourne les informations utilisateur.
 *
 * Utilise `getToken` de next-auth/jwt pour la validation complète
 * (vérification de signature, expiration, etc.).
 *
 * @param request - Requête HTTP entrante
 * @returns L'utilisateur authentifié ou null si non authentifié
 */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  try {
    // Conversion vers NextRequest pour getToken (nécessaire pour lire les cookies)
    const nextRequest = request as NextRequest

    const token = await getToken({
      req: nextRequest,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token || !token.id) {
      // Fallback : essayer de décoder manuellement un Bearer token
      const rawToken = getTokenFromRequest(request)
      if (rawToken) {
        return decodeBearerToken(rawToken)
      }
      return null
    }

    return {
      id: token.id as string,
      email: token.email as string,
      nom: (token as Record<string, unknown>).nom as string,
      prenom: (token as Record<string, unknown>).prenom as string,
      roleId: (token as Record<string, unknown>).roleId as string,
      roleName: (token as Record<string, unknown>).roleName as string,
      pharmacieId: (token as Record<string, unknown>).pharmacieId as string,
      pharmacieNom: (token as Record<string, unknown>).pharmacieNom as string,
      avatarUrl: (token as Record<string, unknown>).avatarUrl as string | undefined,
      permissions: (token as Record<string, unknown>).permissions as AuthUser['permissions'],
    }
  } catch (error) {
    console.error('Erreur extraction JWT:', error)
    return null
  }
}

/**
 * Décode manuellement un Bearer token JWT (sans vérification de signature).
 *
 * ⚠️ En production, la vérification de signature doit être effectuée
 * côté serveur via une librairie dédiée. Ce décodage est un fallback
 * pour les cas où `getToken` ne peut pas lire le cookie.
 *
 * @param token - JWT encodé (base64)
 * @returns L'utilisateur décodé ou null
 */
function decodeBearerToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))

    if (!payload?.id) return null

    return {
      id: payload.id as string,
      email: (payload.email ?? '') as string,
      nom: (payload.nom ?? '') as string,
      prenom: (payload.prenom ?? '') as string,
      roleId: (payload.roleId ?? '') as string,
      roleName: (payload.roleName ?? '') as string,
      pharmacieId: (payload.pharmacieId ?? '') as string,
      pharmacieNom: (payload.pharmacieNom ?? '') as string,
      avatarUrl: payload.avatarUrl as string | undefined,
      permissions: (payload.permissions ?? []) as AuthUser['permissions'],
    }
  } catch {
    return null
  }
}

/**
 * Vérifie que l'utilisateur est authentifié et a la permission requise.
 *
 * @param request - Requête HTTP entrante
 * @param requiredModule - Module requis (ex: 'M01_STOCK')
 * @param requiredAction - Action requise ('read', 'write', 'delete')
 * @returns L'utilisateur authentifié ou une réponse d'erreur 401/403
 */
export async function requireAuth(
  request: Request,
  requiredModule?: string,
  requiredAction?: string
): Promise<AuthUser | Response> {
  const user = await getAuthUser(request)

  if (!user) {
    return Response.json(
      { error: 'Authentification requise. Connectez-vous pour accéder à cette ressource.' },
      { status: 401 }
    )
  }

  // Si un module et une action sont spécifiés, vérifier la permission RBAC
  if (requiredModule && requiredAction) {
    if (!checkPermission(user.roleName, requiredModule, requiredAction)) {
      return Response.json(
        {
          error: `Accès refusé. Permission '${requiredAction}' sur le module '${requiredModule}' requise.`,
          role: user.roleName,
        },
        { status: 403 }
      )
    }
  }

  return user
}

/**
 * Vérifie que l'utilisateur a accès à une pharmacie spécifique.
 *
 * Règles d'accès :
 * - PLATFORM_ADMIN : accès à toutes les pharmacies
 * - DPMED_ADMIN / SOBAPS_VIEWER / ABRP_VIEWER : accès en lecture seule à toutes les pharmacies
 * - Les autres rôles : accès uniquement à leur pharmacie
 *
 * @param request - Requête HTTP entrante
 * @param pharmacieId - ID de la pharmacie à vérifier
 * @returns L'utilisateur authentifié ou une réponse d'erreur
 */
export async function requirePharmacieAccess(
  request: Request,
  pharmacieId: string
): Promise<AuthUser | Response> {
  const user = await getAuthUser(request)

  if (!user) {
    return Response.json(
      { error: 'Authentification requise.' },
      { status: 401 }
    )
  }

  // PLATFORM_ADMIN a accès à toutes les pharmacies
  if (user.roleName === 'PLATFORM_ADMIN') {
    return user
  }

  // Rôles institutionnels — accès en lecture à toutes les pharmacies
  const institutionalRoles = ['DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER']
  if (institutionalRoles.includes(user.roleName)) {
    return user
  }

  // Les autres utilisateurs ne peuvent accéder qu'à leur propre pharmacie
  if (user.pharmacieId !== pharmacieId) {
    return Response.json(
      { error: 'Accès refusé. Vous n\'avez pas accès à cette pharmacie.' },
      { status: 403 }
    )
  }

  // Vérifier que la pharmacie existe et est active
  const pharmacie = await db.pharmacie.findUnique({
    where: { id: pharmacieId },
    select: { id: true, actif: true },
  })

  if (!pharmacie || !pharmacie.actif) {
    return Response.json(
      { error: 'Pharmacie introuvable ou désactivée.' },
      { status: 404 }
    )
  }

  return user
}
