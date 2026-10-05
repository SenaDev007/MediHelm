// ============================================================
// MediHelm — Helper d'authentification pour les routes API
// Extraction du JWT, vérification de permissions, accès pharmacie
// Support Authorization Bearer header + cookie NextAuth
// ============================================================

import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import type { AuthUser } from '@/lib/rbac'
import { checkPermission } from '@/lib/rbac'
import { db } from '@/lib/db'
import { resolveAuthSecret } from '@/lib/auth-secret'
import { validateDbSessionCached } from '@/lib/session-store'

/**
 * Vérifie le JWT NextAuth et retourne les informations utilisateur.
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
      // Même résolution de secret que la signature des JWT (src/lib/auth.ts)
      secret: resolveAuthSecret(),
    })

    // getToken verifies the NextAuth token (including Authorization: Bearer).
    // Never trust a payload decoded without cryptographic verification.
    if (!token || !token.id) return null

    // ─── Validation stricte de la session persistée en base ────────────────
    // Le JWT seul ne suffit plus : la session correspondante doit exister,
    // être active (non révoquée) et non expirée dans SessionUtilisateur.
    // Une session révoquée (déconnexion, désactivation) est rejetée ici —
    // même si le cookie/JWT n'a pas encore expiré naturellement. Le cache
    // court (30 s) est invalidé immédiatement à toute révocation.
    const tokenRecord = token as unknown as Record<string, unknown>
    if (
      typeof tokenRecord.sid !== 'string' ||
      typeof token.id !== 'string' ||
      !(await validateDbSessionCached(tokenRecord.sid, token.id))
    ) {
      return null
    }

    // Mapping OWNER (Prisma enum) → ADMIN (RBAC) pour cohérence
    const rawRoleName = tokenRecord.roleName as string
    const roleName = rawRoleName === 'OWNER' ? 'ADMIN' : rawRoleName

    return {
      id: token.id as string,
      email: token.email as string,
      nom: tokenRecord.nom as string,
      prenom: tokenRecord.prenom as string,
      roleId: tokenRecord.roleId as string,
      roleName,
      pharmacieId: tokenRecord.pharmacieId as string,
      pharmacieNom: tokenRecord.pharmacieNom as string,
      grossisteId: tokenRecord.grossisteId as string | null | undefined,
      grossisteNom: tokenRecord.grossisteNom as string | null | undefined,
      avatarUrl: tokenRecord.avatarUrl as string | undefined,
      permissions: tokenRecord.permissions as AuthUser['permissions'],
    }
  } catch (error) {
    console.error('Erreur extraction JWT:', error)
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

/** Resolve and authorize a patient record from the verified session. */
export async function requirePatientAccess(
  request: Request,
  requestedPatientId: string | null | undefined,
  requiredModule: string,
  requiredAction: string
): Promise<{ user: AuthUser; patientId: string } | Response> {
  const authResult = await requireAuth(request, requiredModule, requiredAction)
  if (authResult instanceof Response) return authResult

  if (authResult.roleName === 'PATIENT') {
    const patient = await db.patient.findFirst({
      where: { utilisateurId: authResult.id, actif: true },
      select: { id: true },
    })
    if (!patient) return Response.json({ error: 'Dossier patient introuvable' }, { status: 404 })
    if (requestedPatientId && requestedPatientId !== patient.id) {
      return Response.json({ error: 'Accès refusé à ce dossier patient' }, { status: 403 })
    }
    return { user: authResult, patientId: patient.id }
  }

  if (!requestedPatientId) {
    return Response.json({ error: 'Le paramètre patientId est requis' }, { status: 400 })
  }
  if (authResult.roleName !== 'PLATFORM_ADMIN' && !authResult.pharmacieId) {
    return Response.json({ error: 'Tenant utilisateur manquant' }, { status: 403 })
  }
  const patient = await db.patient.findFirst({
    where: {
      id: requestedPatientId,
      ...(authResult.roleName === 'PLATFORM_ADMIN' ? {} : { pharmacieId: authResult.pharmacieId }),
    },
    select: { id: true },
  })
  if (!patient) return Response.json({ error: 'Patient non trouvé ou hors de votre pharmacie' }, { status: 404 })
  return { user: authResult, patientId: patient.id }
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

/**
 * Vérifie que l'utilisateur courant peut agir sur le grossiste donné.
 * - Rôles grossiste (PARTNER/ADMIN/COMMANDES/PREPARATEUR/LIVREUR/COMMERCIAL/COMPTABLE) :
 *   uniquement LEUR grossiste (user.grossisteId) — tenant isolé.
 * - Rôles pharmacie / PLATFORM_ADMIN : accès autorisé (relation commerciale).
 * Retourne null si autorisé, sinon une Response d'erreur (403/400).
 */
export const GROSSISTE_TENANT_ROLES = [
  'GROSSISTE_PARTNER',
  'GROSSISTE_ADMIN',
  'GROSSISTE_COMMANDES',
  'GROSSISTE_PREPARATEUR',
  'GROSSISTE_LIVREUR',
  'GROSSISTE_COMMERCIAL',
  'GROSSISTE_COMPTABLE',
] as const

export function checkGrossisteAccess(
  user: AuthUser,
  grossisteId: string | null | undefined
): Response | null {
  if (GROSSISTE_TENANT_ROLES.includes(user.roleName as (typeof GROSSISTE_TENANT_ROLES)[number])) {
    if (!user.grossisteId) {
      return Response.json(
        { error: 'Compte non rattaché à un grossiste. Contactez le support.' },
        { status: 403 }
      )
    }
    if (!grossisteId || grossisteId !== user.grossisteId) {
      return Response.json(
        { error: 'Accès refusé: vous ne pouvez accéder qu\'à votre propre espace grossiste.' },
        { status: 403 }
      )
    }
  }
  return null
}

/**
 * RBAC fin des modules ERP grossiste (CDC Grossiste §3 — rôles par module G).
 * Retourne null si autorisé, sinon une Response 403.
 * PLATFORM_ADMIN et GROSSISTE_PARTNER (partenaire historique full-access) passent toujours.
 */
export function requireGrossisteModule(
  user: AuthUser,
  allowedRoles: Array<(typeof GROSSISTE_TENANT_ROLES)[number]>
): Response | null {
  if (user.roleName === 'PLATFORM_ADMIN' || user.roleName === 'GROSSISTE_PARTNER') return null
  if (allowedRoles.includes(user.roleName as (typeof GROSSISTE_TENANT_ROLES)[number])) return null
  return Response.json(
    { error: `Accès refusé — module réservé aux rôles : ${allowedRoles.join(', ')}` },
    { status: 403 }
  )
}

/**
 * Vérifie que l'utilisateur possède un des rôles institutionnels autorisés
 * (les permissions de module seules ne suffisent pas: les rôles pharmacie
 * comme DIRECTEUR ont M14/M18/M19 en lecture — l'accès institutionnel doit
 * être réservé aux rôles dédiés + PLATFORM_ADMIN).
 * Retourne null si autorisé, sinon une Response 403.
 */
export function checkInstitutionRole(
  user: AuthUser,
  allowedRoles: Array<'DPMED_ADMIN' | 'SOBAPS_VIEWER' | 'ABRP_VIEWER' | 'PLATFORM_ADMIN'>
): Response | null {
  if (user.roleName === 'PLATFORM_ADMIN') return null
  if (!allowedRoles.includes(user.roleName as 'DPMED_ADMIN' | 'SOBAPS_VIEWER' | 'ABRP_VIEWER' | 'PLATFORM_ADMIN')) {
    return Response.json(
      { error: 'Accès réservé aux rôles institutionnels autorisés.' },
      { status: 403 }
    )
  }
  return null
}
