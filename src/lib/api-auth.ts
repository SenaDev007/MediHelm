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
      secret: process.env.NEXTAUTH_SECRET,
    })

    // getToken verifies the NextAuth token (including Authorization: Bearer).
    // Never trust a payload decoded without cryptographic verification.
    if (!token || !token.id) return null

    // Mapping OWNER (Prisma enum) → ADMIN (RBAC) pour cohérence
    const rawRoleName = (token as unknown as Record<string, unknown>).roleName as string
    const roleName = rawRoleName === 'OWNER' ? 'ADMIN' : rawRoleName

    return {
      id: token.id as string,
      email: token.email as string,
      nom: (token as unknown as Record<string, unknown>).nom as string,
      prenom: (token as unknown as Record<string, unknown>).prenom as string,
      roleId: (token as unknown as Record<string, unknown>).roleId as string,
      roleName,
      pharmacieId: (token as unknown as Record<string, unknown>).pharmacieId as string,
      pharmacieNom: (token as unknown as Record<string, unknown>).pharmacieNom as string,
      avatarUrl: (token as unknown as Record<string, unknown>).avatarUrl as string | undefined,
      permissions: (token as unknown as Record<string, unknown>).permissions as AuthUser['permissions'],
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
