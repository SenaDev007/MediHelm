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
 * Configuration NextAuth — stratégie JWT, provider Credentials
 */
export const authOptions: NextAuthOptions = {
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis')
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
          throw new Error('Identifiants invalides')
        }

        // Vérifier que le compte est actif
        if (!utilisateur.actif) {
          throw new Error('Compte désactivé. Contactez votre administrateur.')
        }

        // Vérifier que la pharmacie est active
        if (!utilisateur.pharmacie.actif) {
          throw new Error('Pharmacie désactivée. Contactez le support MediHelm.')
        }

        // Vérification du mot de passe (bcrypt + SHA-256 legacy)
        if (!(await verifyPassword(credentials.password, utilisateur.motDePasse))) {
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
    secret: process.env.NEXTAUTH_SECRET,
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
