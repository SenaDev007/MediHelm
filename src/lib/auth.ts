// ============================================================
// MediHelm — Configuration NextAuth.js v4
// Authentification par email/mot de passe avec JWT
// Simplified for SQLite dev schema (no Role/Permission models)
// ============================================================

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { getRolePermissions } from '@/lib/rbac'
import { checkRateLimit, isRateLimited, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveAuthSecret } from '@/lib/auth-secret'

type MediHelmAuthUser = {
  id: string
  email: string
  name: string
  nom: string
  prenom: string
  roleId: string
  roleName: string
  pharmacieId: string
  pharmacieNom: string
  grossisteId?: string | null
  permissions: Array<{ module: string; action: string; code: string }>
}

/**
 * Hash un mot de passe avec bcrypt (cost factor 12)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Vérifie un mot de passe contre un hash
 * Supporte les hashes bcrypt ($2a$/$2b$) et SHA-256 (legacy) pour la migration
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Support bcrypt hashes
  if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2y$')) {
    return bcrypt.compare(password, hashedPassword)
  }
  // Legacy SHA-256 fallback
  const { createHash } = await import('crypto')
  const sha256Hash = createHash('sha256').update(password).digest('hex')
  const expected = Buffer.from(sha256Hash, 'hex')
  const actual = Buffer.from(hashedPassword, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/**
 * Extrait l'IP client depuis la requête NextAuth — tolère les deux formats
 * (Headers standard avec .get(), ou objet simple { 'x-forwarded-for': ... }).
 */
function extractClientIp(req: unknown): string {
  try {
    const headers = (req as { headers?: Record<string, unknown> & { get?: (k: string) => string | null } })?.headers
    if (!headers) return 'unknown'
    if (typeof headers.get === 'function') {
      return (
        headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        headers.get('x-real-ip')?.trim() ||
        'unknown'
      )
    }
    const fwd = headers['x-forwarded-for'] ?? headers['X-Forwarded-For']
    if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim()
    const real = headers['x-real-ip'] ?? headers['X-Real-Ip']
    if (typeof real === 'string' && real) return real.trim()
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Configuration NextAuth — stratégie JWT, provider Credentials
 */
export const authOptions: NextAuthOptions = {
  // ─── Secret de signature — NIVEAU RACINE (obligatoire) ────────────────────
  // Le handler App Router de NextAuth v4 (NextAuthRouteHandler) ne fusionne
  // PAS options.jwt.secret vers options.secret : sans secret racine, la
  // production sans NEXTAUTH_SECRET configuré renvoie MissingSecret → HTTP
  // 500 « There is a problem with the server configuration » sur TOUTES les
  // routes /api/auth/*. Résilience : NEXTAUTH_SECRET > AUTH_SECRET > valeur
  // dérivée de la chaîne DB (voir src/lib/auth-secret.ts).
  secret: resolveAuthSecret(),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'admin@medihelm.bj',
        },
        password: {
          label: 'Mot de passe',
          type: 'password',
        },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis')
        }

        // Anti brute-force (cursorrules:406 — AUTH_LOGIN 5 échecs / 15 min / IP+email)
        // Comptage des ÉCHECS uniquement : un login réussi ne consomme pas le quota.
        const clientIp = extractClientIp(req)
        const loginKey = `login:${clientIp}:${credentials.email}`
        const registerFailure = () => {
          const attempt = checkRateLimit(loginKey, RATE_LIMITS.AUTH_LOGIN)
          if (!attempt.allowed) {
            throw new Error('Trop de tentatives de connexion. Réessayez dans 15 minutes.')
          }
        }
        if (isRateLimited(loginKey, RATE_LIMITS.AUTH_LOGIN)) {
          throw new Error('Trop de tentatives de connexion. Réessayez dans 15 minutes.')
        }

        // Recherche de l'utilisateur par email
        const utilisateur = await db.utilisateur.findUnique({
          where: { email: credentials.email },
          include: {
            pharmacie: true,
            grossiste: { select: { id: true, nom: true } },
          },
        })

        if (!utilisateur) {
          registerFailure()
          throw new Error('Identifiants invalides')
        }

        // Vérifier que le compte est actif
        if (!utilisateur.actif) {
          registerFailure()
          throw new Error('Compte désactivé. Contactez votre administrateur.')
        }

        // Vérifier que la pharmacie est active — UNIQUEMENT si l'utilisateur
        // est rattaché à une officine. Les comptes grossistes et institutionnels
        // n'ont PAS de pharmacie (relation null) : l'ancien accès direct
        // `utilisateur.pharmacie.actif` levait un TypeError qui faisait échouer
        // leur connexion avec une erreur générique.
        if (utilisateur.pharmacie && !utilisateur.pharmacie.actif) {
          registerFailure()
          throw new Error('Pharmacie désactivée. Contactez le support MediHelm.')
        }

        // Vérification du mot de passe (bcrypt + SHA-256 legacy)
        if (!(await verifyPassword(credentials.password, utilisateur.motDePasse))) {
          registerFailure()
          throw new Error('Identifiants invalides')
        }
        if (!/^\$2[aby]\$/.test(utilisateur.motDePasse)) {
          await db.utilisateur.update({
            where: { id: utilisateur.id },
            data: { motDePasse: await hashPassword(credentials.password) },
          })
        }

        // Retourner l'objet utilisateur (sera encodé dans le JWT)
        // Mapping OWNER (Prisma enum) → ADMIN (RBAC) pour cohérence
        const roleName = utilisateur.role === 'OWNER' ? 'ADMIN' : utilisateur.role
        const permissionSet = getRolePermissions(roleName) || {}
        const permissions = Object.entries(permissionSet).flatMap(([module, actions]) =>
          Object.entries(actions)
            .filter(([, allowed]) => allowed)
            .map(([action]) => ({ module, action, code: `${module}:${action}` }))
        )

        return {
          id: utilisateur.id,
          email: utilisateur.email,
          name: `${utilisateur.prenom} ${utilisateur.nom}`,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
          roleId: utilisateur.role,
          roleName,
          pharmacieId: utilisateur.pharmacieId,
          pharmacieNom: utilisateur.pharmacie.nom,
          grossisteId: utilisateur.grossisteId,
          permissions,
        } satisfies MediHelmAuthUser
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 heures
    updateAge: 60 * 60, // Mise à jour toutes les heures
  },

  jwt: {
    // Résilience : NEXTAUTH_SECRET > AUTH_SECRET > valeur dérivée de la
    // chaîne DB (déploiements où la variable n'est pas encore configurée).
    // Sans secret en production, NextAuth refuse TOUTES les connexions
    // (MissingSecret → HTTP 500 « There is a problem with the server
    // configuration »). Voir src/lib/auth-secret.ts.
    secret: resolveAuthSecret(),
    maxAge: 24 * 60 * 60, // 24 heures
  },

  pages: {
    signIn: '/connexion',
    error: '/connexion',
  },

  callbacks: {
    /**
     * Callback JWT — enrichit le token avec les données métier
     */
    async jwt({ token, user }) {
      // À la connexion initiale, `user` contient les données retournées par authorize()
      if (user) {
        const authUser = user as unknown as MediHelmAuthUser
        token.id = user.id
        token.nom = authUser.nom
        token.prenom = authUser.prenom
        token.roleId = authUser.roleId
        token.roleName = authUser.roleName
        token.pharmacieId = authUser.pharmacieId
        token.pharmacieNom = authUser.pharmacieNom
        token.grossisteId = authUser.grossisteId ?? null
        token.permissions = authUser.permissions
      }
      return token
    },

    /**
     * Callback session — enrichit la session client avec les données du JWT
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.roleId = token.roleId
        ;(session.user as Record<string, unknown>).nom = token.nom
        ;(session.user as Record<string, unknown>).prenom = token.prenom
        ;(session.user as Record<string, unknown>).roleName = token.roleName
        ;(session.user as Record<string, unknown>).pharmacieId = token.pharmacieId
        ;(session.user as Record<string, unknown>).pharmacieNom = token.pharmacieNom
        ;(session.user as Record<string, unknown>).grossisteId = token.grossisteId
        session.user.permissions = token.permissions
      }
      return session
    },
  },

  // Activation du debug en développement uniquement
  debug: process.env.NODE_ENV === 'development',
}
