// ============================================================
// MediHelm — Augmentation des types NextAuth.js
// Ajoute les propriétés personnalisées au JWT et à la Session
// ============================================================

import type { PermissionSet } from '@/lib/rbac'

declare module 'next-auth' {
  interface Session {
    user: {
      /** ID de l'utilisateur */
      id: string
      /** Nom de famille */
      nom: string
      /** Prénom */
      prenom: string
      /** Email */
      email: string
      /** Nom d'affichage */
      name: string
      /** ID du rôle */
      roleId: string
      /** Nom du rôle (ex: 'ADMIN', 'PHARMACIEN') */
      roleName: string
      /** ID de la pharmacie */
      pharmacieId: string
      /** Nom de la pharmacie */
      pharmacieNom: string
      /** ID du grossiste rattaché (comptes grossistes) */
      grossisteId?: string | null
      /** Nom du grossiste rattaché */
      grossisteNom?: string | null
      /** ID de la session persistée en base (SessionUtilisateur) */
      sessionId?: string
      /** URL de l'avatar */
      avatarUrl?: string
      /** Permissions du rôle */
      permissions: Array<{
        module: string
        action: string
        code: string
      }>
    }
  }

  interface User {
    id: string
    nom: string
    prenom: string
    email: string
    roleId: string
    roleName: string
    pharmacieId: string
    pharmacieNom: string
    grossisteId?: string | null
    grossisteNom?: string | null
    avatarUrl?: string
    permissions: Array<{
      module: string
      action: string
      code: string
    }>
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    nom: string
    prenom: string
    roleId: string
    roleName: string
    pharmacieId: string
    pharmacieNom: string
    grossisteId?: string | null
    grossisteNom?: string | null
    /** ID de la session persistée en base */
    sid?: string
    /** Identifiant unique du JWT (relié à la ligne SessionUtilisateur) */
    jti?: string
    avatarUrl?: string
    permissions: Array<{
      module: string
      action: string
      code: string
    }>
  }
}
