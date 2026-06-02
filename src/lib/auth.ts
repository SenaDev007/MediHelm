// ============================================================
// MédiHelm — Configuration NextAuth.js v4
// Authentification par email/mot de passe avec JWT
// ============================================================

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createHash } from 'crypto'
import { db } from '@/lib/db'

/**
 * Hash un mot de passe en SHA-256
 * Note: En production, utiliser bcrypt/argon2 — SHA-256 est un substitut temporaire
 * car bcryptjs n'est pas installé dans ce projet.
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

/**
 * Vérifie un mot de passe contre un hash SHA-256
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword
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
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            pharmacie: true,
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
          throw new Error('Pharmacie désactivée. Contactez le support MédiHelm.')
        }

        // Vérification du mot de passe (SHA-256)
        if (!verifyPassword(credentials.password, utilisateur.motDePasse)) {
          throw new Error('Identifiants invalides')
        }

        // Mettre à jour la date de dernier login
        await db.utilisateur.update({
          where: { id: utilisateur.id },
          data: { dernierLogin: new Date() },
        })

        // Extraire les permissions du rôle
        const permissions = utilisateur.role.permissions.map((rp) => ({
          module: rp.permission.module,
          action: rp.permission.action,
          code: rp.permission.code,
        }))

        // Retourner l'objet utilisateur (sera encodé dans le JWT)
        return {
          id: utilisateur.id,
          email: utilisateur.email,
          name: `${utilisateur.prenom} ${utilisateur.nom}`,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
          roleId: utilisateur.roleId,
          roleName: utilisateur.role.nom,
          pharmacieId: utilisateur.pharmacieId,
          pharmacieNom: utilisateur.pharmacie.nom,
          avatarUrl: utilisateur.avatarUrl,
          permissions,
        }
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
        token.id = user.id
        token.nom = (user as Record<string, unknown>).nom
        token.prenom = (user as Record<string, unknown>).prenom
        token.roleId = (user as Record<string, unknown>).roleId
        token.roleName = (user as Record<string, unknown>).roleName
        token.pharmacieId = (user as Record<string, unknown>).pharmacieId
        token.pharmacieNom = (user as Record<string, unknown>).pharmacieNom
        token.avatarUrl = (user as Record<string, unknown>).avatarUrl
        token.permissions = (user as Record<string, unknown>).permissions
      }
      return token
    },

    /**
     * Callback session — enrichit la session client avec les données du JWT
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as Record<string, unknown>).nom = token.nom
        ;(session.user as Record<string, unknown>).prenom = token.prenom
        ;(session.user as Record<string, unknown>).roleId = token.roleId
        ;(session.user as Record<string, unknown>).roleName = token.roleName
        ;(session.user as Record<string, unknown>).pharmacieId = token.pharmacieId
        ;(session.user as Record<string, unknown>).pharmacieNom = token.pharmacieNom
        ;(session.user as Record<string, unknown>).avatarUrl = token.avatarUrl
        ;(session.user as Record<string, unknown>).permissions = token.permissions
      }
      return session
    },
  },

  // Activation du debug en développement uniquement
  debug: process.env.NODE_ENV === 'development',
}
