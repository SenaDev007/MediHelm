// ============================================================
// MédiHelm — Système RBAC (Role-Based Access Control)
// Définition des rôles, permissions par module (M01-M19)
// Vérification d'accès et wrapper pour les routes API
// ============================================================

// === Définition des rôles MédiHelm ===

export const ROLES = {
  ADMIN: 'ADMIN',
  DIRECTEUR: 'DIRECTEUR',
  PHARMACIEN: 'PHARMACIEN',
  CAISSIER: 'CAISSIER',
  MAGASINIER: 'MAGASINIER',
  PROMOTEUR: 'PROMOTEUR',
  DPMED_ADMIN: 'DPMED_ADMIN',
  SOBAPS_VIEWER: 'SOBAPS_VIEWER',
  ABRP_VIEWER: 'ABRP_VIEWER',
  GROSSISTE_PARTNER: 'GROSSISTE_PARTNER',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
} as const

export type RoleKey = keyof typeof ROLES
export type RoleName = (typeof ROLES)[RoleKey]

// === Définition des modules (M01-M19) ===

export const MODULES = {
  M01_STOCK: 'M01_STOCK',
  M02_POS: 'M02_POS',
  M03_COMMANDES: 'M03_COMMANDES',
  M04_FOURNISSEURS: 'M04_FOURNISSEURS',
  M05_PATIENTS: 'M05_PATIENTS',
  M06_ORDONNANCES: 'M06_ORDONNANCES',
  M07_RH: 'M07_RH',
  M08_FINANCE: 'M08_FINANCE',
  M09_GARDE: 'M09_GARDE',
  M10_REMBOURSABLES: 'M10_REMBOURSABLES',
  M11_RETOURS: 'M11_RETOURS',
  M12_COMMUNICATION: 'M12_COMMUNICATION',
  M13_DOCUMENTS: 'M13_DOCUMENTS',
  M14_DASHBOARD: 'M14_DASHBOARD',
  M15_ANALYTICS: 'M15_ANALYTICS',
  M16_PHARMACOVIGILANCE: 'M16_PHARMACOVIGILANCE',
  M17_GROSSISTES: 'M17_GROSSISTES',
  M18_ALERTES_DPMED: 'M18_ALERTES_DPMED',
  M19_CONFORMITE: 'M19_CONFORMITE',
} as const

export type ModuleKey = keyof typeof MODULES
export type ModuleName = (typeof MODULES)[ModuleKey]

// === Actions possibles ===

export const ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
} as const

export type ActionName = (typeof ACTIONS)[keyof typeof ACTIONS]

// === Types de permissions ===

export interface PermissionSet {
  [module: string]: {
    read: boolean
    write: boolean
    delete: boolean
  }
}

// === Matrice des permissions par rôle ===
// true = accès autorisé, false = accès refusé
// R = Read, W = Write, D = Delete

const ROLE_PERMISSIONS: Record<string, PermissionSet> = {
  // ADMIN — Accès complet à tous les modules
  [ROLES.ADMIN]: {
    M01_STOCK: { read: true, write: true, delete: true },
    M02_POS: { read: true, write: true, delete: true },
    M03_COMMANDES: { read: true, write: true, delete: true },
    M04_FOURNISSEURS: { read: true, write: true, delete: true },
    M05_PATIENTS: { read: true, write: true, delete: true },
    M06_ORDONNANCES: { read: true, write: true, delete: true },
    M07_RH: { read: true, write: true, delete: true },
    M08_FINANCE: { read: true, write: true, delete: true },
    M09_GARDE: { read: true, write: true, delete: true },
    M10_REMBOURSABLES: { read: true, write: true, delete: true },
    M11_RETOURS: { read: true, write: true, delete: true },
    M12_COMMUNICATION: { read: true, write: true, delete: true },
    M13_DOCUMENTS: { read: true, write: true, delete: true },
    M14_DASHBOARD: { read: true, write: true, delete: true },
    M15_ANALYTICS: { read: true, write: true, delete: true },
    M16_PHARMACOVIGILANCE: { read: true, write: true, delete: true },
    M17_GROSSISTES: { read: true, write: true, delete: true },
    M18_ALERTES_DPMED: { read: true, write: true, delete: true },
    M19_CONFORMITE: { read: true, write: true, delete: true },
  },

  // DIRECTEUR — Accès complet sauf suppression sur certains modules sensibles
  [ROLES.DIRECTEUR]: {
    M01_STOCK: { read: true, write: true, delete: false },
    M02_POS: { read: true, write: true, delete: false },
    M03_COMMANDES: { read: true, write: true, delete: false },
    M04_FOURNISSEURS: { read: true, write: true, delete: false },
    M05_PATIENTS: { read: true, write: true, delete: false },
    M06_ORDONNANCES: { read: true, write: true, delete: false },
    M07_RH: { read: true, write: true, delete: false },
    M08_FINANCE: { read: true, write: true, delete: true },
    M09_GARDE: { read: true, write: true, delete: false },
    M10_REMBOURSABLES: { read: true, write: true, delete: false },
    M11_RETOURS: { read: true, write: true, delete: false },
    M12_COMMUNICATION: { read: true, write: true, delete: false },
    M13_DOCUMENTS: { read: true, write: true, delete: false },
    M14_DASHBOARD: { read: true, write: true, delete: false },
    M15_ANALYTICS: { read: true, write: true, delete: false },
    M16_PHARMACOVIGILANCE: { read: true, write: true, delete: false },
    M17_GROSSISTES: { read: true, write: true, delete: false },
    M18_ALERTES_DPMED: { read: true, write: true, delete: false },
    M19_CONFORMITE: { read: true, write: true, delete: false },
  },

  // PHARMACIEN — Accès clinique et pharmacologique
  [ROLES.PHARMACIEN]: {
    M01_STOCK: { read: true, write: true, delete: false },
    M02_POS: { read: true, write: true, delete: false },
    M03_COMMANDES: { read: true, write: true, delete: false },
    M04_FOURNISSEURS: { read: true, write: false, delete: false },
    M05_PATIENTS: { read: true, write: true, delete: false },
    M06_ORDONNANCES: { read: true, write: true, delete: false },
    M07_RH: { read: true, write: false, delete: false },
    M08_FINANCE: { read: true, write: false, delete: false },
    M09_GARDE: { read: true, write: true, delete: false },
    M10_REMBOURSABLES: { read: true, write: true, delete: false },
    M11_RETOURS: { read: true, write: true, delete: false },
    M12_COMMUNICATION: { read: true, write: true, delete: false },
    M13_DOCUMENTS: { read: true, write: true, delete: false },
    M14_DASHBOARD: { read: true, write: false, delete: false },
    M15_ANALYTICS: { read: true, write: false, delete: false },
    M16_PHARMACOVIGILANCE: { read: true, write: true, delete: false },
    M17_GROSSISTES: { read: true, write: false, delete: false },
    M18_ALERTES_DPMED: { read: true, write: false, delete: false },
    M19_CONFORMITE: { read: true, write: false, delete: false },
  },

  // CAISSIER — Accès limité au POS et ventes
  [ROLES.CAISSIER]: {
    M01_STOCK: { read: true, write: false, delete: false },
    M02_POS: { read: true, write: true, delete: false },
    M03_COMMANDES: { read: false, write: false, delete: false },
    M04_FOURNISSEURS: { read: false, write: false, delete: false },
    M05_PATIENTS: { read: true, write: false, delete: false },
    M06_ORDONNANCES: { read: true, write: false, delete: false },
    M07_RH: { read: false, write: false, delete: false },
    M08_FINANCE: { read: false, write: false, delete: false },
    M09_GARDE: { read: false, write: false, delete: false },
    M10_REMBOURSABLES: { read: true, write: false, delete: false },
    M11_RETOURS: { read: false, write: false, delete: false },
    M12_COMMUNICATION: { read: false, write: false, delete: false },
    M13_DOCUMENTS: { read: false, write: false, delete: false },
    M14_DASHBOARD: { read: true, write: false, delete: false },
    M15_ANALYTICS: { read: false, write: false, delete: false },
    M16_PHARMACOVIGILANCE: { read: false, write: false, delete: false },
    M17_GROSSISTES: { read: false, write: false, delete: false },
    M18_ALERTES_DPMED: { read: true, write: false, delete: false },
    M19_CONFORMITE: { read: false, write: false, delete: false },
  },

  // MAGASINIER — Accès stock, commandes, réceptions
  [ROLES.MAGASINIER]: {
    M01_STOCK: { read: true, write: true, delete: false },
    M02_POS: { read: false, write: false, delete: false },
    M03_COMMANDES: { read: true, write: true, delete: false },
    M04_FOURNISSEURS: { read: true, write: false, delete: false },
    M05_PATIENTS: { read: false, write: false, delete: false },
    M06_ORDONNANCES: { read: false, write: false, delete: false },
    M07_RH: { read: false, write: false, delete: false },
    M08_FINANCE: { read: false, write: false, delete: false },
    M09_GARDE: { read: false, write: false, delete: false },
    M10_REMBOURSABLES: { read: false, write: false, delete: false },
    M11_RETOURS: { read: true, write: true, delete: false },
    M12_COMMUNICATION: { read: false, write: false, delete: false },
    M13_DOCUMENTS: { read: true, write: false, delete: false },
    M14_DASHBOARD: { read: true, write: false, delete: false },
    M15_ANALYTICS: { read: false, write: false, delete: false },
    M16_PHARMACOVIGILANCE: { read: false, write: false, delete: false },
    M17_GROSSISTES: { read: true, write: true, delete: false },
    M18_ALERTES_DPMED: { read: true, write: false, delete: false },
    M19_CONFORMITE: { read: false, write: false, delete: false },
  },

  // PROMOTEUR — Vue réseau, analytics, conformité
  [ROLES.PROMOTEUR]: {
    M01_STOCK: { read: true, write: false, delete: false },
    M02_POS: { read: true, write: false, delete: false },
    M03_COMMANDES: { read: true, write: false, delete: false },
    M04_FOURNISSEURS: { read: true, write: false, delete: false },
    M05_PATIENTS: { read: true, write: false, delete: false },
    M06_ORDONNANCES: { read: true, write: false, delete: false },
    M07_RH: { read: true, write: false, delete: false },
    M08_FINANCE: { read: true, write: true, delete: false },
    M09_GARDE: { read: true, write: false, delete: false },
    M10_REMBOURSABLES: { read: true, write: false, delete: false },
    M11_RETOURS: { read: true, write: false, delete: false },
    M12_COMMUNICATION: { read: true, write: true, delete: false },
    M13_DOCUMENTS: { read: true, write: true, delete: false },
    M14_DASHBOARD: { read: true, write: true, delete: false },
    M15_ANALYTICS: { read: true, write: true, delete: false },
    M16_PHARMACOVIGILANCE: { read: true, write: false, delete: false },
    M17_GROSSISTES: { read: true, write: false, delete: false },
    M18_ALERTES_DPMED: { read: true, write: false, delete: false },
    M19_CONFORMITE: { read: true, write: true, delete: false },
  },

  // DPMED_ADMIN — Gestion des alertes et pharmacovigilance institutionnelle
  [ROLES.DPMED_ADMIN]: {
    M01_STOCK: { read: false, write: false, delete: false },
    M02_POS: { read: false, write: false, delete: false },
    M03_COMMANDES: { read: false, write: false, delete: false },
    M04_FOURNISSEURS: { read: false, write: false, delete: false },
    M05_PATIENTS: { read: false, write: false, delete: false },
    M06_ORDONNANCES: { read: false, write: false, delete: false },
    M07_RH: { read: false, write: false, delete: false },
    M08_FINANCE: { read: false, write: false, delete: false },
    M09_GARDE: { read: false, write: false, delete: false },
    M10_REMBOURSABLES: { read: false, write: false, delete: false },
    M11_RETOURS: { read: false, write: false, delete: false },
    M12_COMMUNICATION: { read: true, write: true, delete: false },
    M13_DOCUMENTS: { read: true, write: true, delete: false },
    M14_DASHBOARD: { read: true, write: false, delete: false },
    M15_ANALYTICS: { read: true, write: false, delete: false },
    M16_PHARMACOVIGILANCE: { read: true, write: true, delete: true },
    M17_GROSSISTES: { read: false, write: false, delete: false },
    M18_ALERTES_DPMED: { read: true, write: true, delete: true },
    M19_CONFORMITE: { read: true, write: true, delete: false },
  },

  // SOBAPS_VIEWER — Consultation SoBAPS uniquement
  [ROLES.SOBAPS_VIEWER]: {
    M01_STOCK: { read: true, write: false, delete: false },
    M02_POS: { read: false, write: false, delete: false },
    M03_COMMANDES: { read: true, write: false, delete: false },
    M04_FOURNISSEURS: { read: true, write: false, delete: false },
    M05_PATIENTS: { read: false, write: false, delete: false },
    M06_ORDONNANCES: { read: false, write: false, delete: false },
    M07_RH: { read: false, write: false, delete: false },
    M08_FINANCE: { read: false, write: false, delete: false },
    M09_GARDE: { read: false, write: false, delete: false },
    M10_REMBOURSABLES: { read: false, write: false, delete: false },
    M11_RETOURS: { read: true, write: false, delete: false },
    M12_COMMUNICATION: { read: true, write: false, delete: false },
    M13_DOCUMENTS: { read: true, write: false, delete: false },
    M14_DASHBOARD: { read: true, write: false, delete: false },
    M15_ANALYTICS: { read: true, write: false, delete: false },
    M16_PHARMACOVIGILANCE: { read: true, write: false, delete: false },
    M17_GROSSISTES: { read: true, write: false, delete: false },
    M18_ALERTES_DPMED: { read: true, write: false, delete: false },
    M19_CONFORMITE: { read: true, write: false, delete: false },
  },

  // ABRP_VIEWER — Consultation ABRP (Agence Béninoise de Régulation Pharmaceutique)
  [ROLES.ABRP_VIEWER]: {
    M01_STOCK: { read: true, write: false, delete: false },
    M02_POS: { read: true, write: false, delete: false },
    M03_COMMANDES: { read: true, write: false, delete: false },
    M04_FOURNISSEURS: { read: true, write: false, delete: false },
    M05_PATIENTS: { read: false, write: false, delete: false },
    M06_ORDONNANCES: { read: true, write: false, delete: false },
    M07_RH: { read: false, write: false, delete: false },
    M08_FINANCE: { read: true, write: false, delete: false },
    M09_GARDE: { read: true, write: false, delete: false },
    M10_REMBOURSABLES: { read: true, write: false, delete: false },
    M11_RETOURS: { read: true, write: false, delete: false },
    M12_COMMUNICATION: { read: false, write: false, delete: false },
    M13_DOCUMENTS: { read: true, write: false, delete: false },
    M14_DASHBOARD: { read: true, write: false, delete: false },
    M15_ANALYTICS: { read: true, write: false, delete: false },
    M16_PHARMACOVIGILANCE: { read: true, write: false, delete: false },
    M17_GROSSISTES: { read: true, write: false, delete: false },
    M18_ALERTES_DPMED: { read: true, write: false, delete: false },
    M19_CONFORMITE: { read: true, write: false, delete: false },
  },

  // GROSSISTE_PARTNER — Accès portail grossiste uniquement
  [ROLES.GROSSISTE_PARTNER]: {
    M01_STOCK: { read: false, write: false, delete: false },
    M02_POS: { read: false, write: false, delete: false },
    M03_COMMANDES: { read: true, write: true, delete: false },
    M04_FOURNISSEURS: { read: false, write: false, delete: false },
    M05_PATIENTS: { read: false, write: false, delete: false },
    M06_ORDONNANCES: { read: false, write: false, delete: false },
    M07_RH: { read: false, write: false, delete: false },
    M08_FINANCE: { read: false, write: false, delete: false },
    M09_GARDE: { read: false, write: false, delete: false },
    M10_REMBOURSABLES: { read: false, write: false, delete: false },
    M11_RETOURS: { read: false, write: false, delete: false },
    M12_COMMUNICATION: { read: false, write: false, delete: false },
    M13_DOCUMENTS: { read: false, write: false, delete: false },
    M14_DASHBOARD: { read: true, write: false, delete: false },
    M15_ANALYTICS: { read: false, write: false, delete: false },
    M16_PHARMACOVIGILANCE: { read: false, write: false, delete: false },
    M17_GROSSISTES: { read: true, write: true, delete: false },
    M18_ALERTES_DPMED: { read: true, write: false, delete: false },
    M19_CONFORMITE: { read: false, write: false, delete: false },
  },

  // PLATFORM_ADMIN — Super-admin plateforme (accès total y compris suppression)
  [ROLES.PLATFORM_ADMIN]: {
    M01_STOCK: { read: true, write: true, delete: true },
    M02_POS: { read: true, write: true, delete: true },
    M03_COMMANDES: { read: true, write: true, delete: true },
    M04_FOURNISSEURS: { read: true, write: true, delete: true },
    M05_PATIENTS: { read: true, write: true, delete: true },
    M06_ORDONNANCES: { read: true, write: true, delete: true },
    M07_RH: { read: true, write: true, delete: true },
    M08_FINANCE: { read: true, write: true, delete: true },
    M09_GARDE: { read: true, write: true, delete: true },
    M10_REMBOURSABLES: { read: true, write: true, delete: true },
    M11_RETOURS: { read: true, write: true, delete: true },
    M12_COMMUNICATION: { read: true, write: true, delete: true },
    M13_DOCUMENTS: { read: true, write: true, delete: true },
    M14_DASHBOARD: { read: true, write: true, delete: true },
    M15_ANALYTICS: { read: true, write: true, delete: true },
    M16_PHARMACOVIGILANCE: { read: true, write: true, delete: true },
    M17_GROSSISTES: { read: true, write: true, delete: true },
    M18_ALERTES_DPMED: { read: true, write: true, delete: true },
    M19_CONFORMITE: { read: true, write: true, delete: true },
  },
}

// === Rôles institutionnels (accès /institutions/*) ===
export const INSTITUTIONAL_ROLES: string[] = [
  ROLES.DPMED_ADMIN,
  ROLES.SOBAPS_VIEWER,
  ROLES.ABRP_VIEWER,
  ROLES.PLATFORM_ADMIN,
]

// === Rôles pharmacie (accès /pro/*) ===
export const PHARMACIE_ROLES: string[] = [
  ROLES.ADMIN,
  ROLES.DIRECTEUR,
  ROLES.PHARMACIEN,
  ROLES.CAISSIER,
  ROLES.MAGASINIER,
  ROLES.PROMOTEUR,
]

// === Rôles grossiste (accès /grossistes/*) ===
export const GROSSISTE_ROLES: string[] = [
  ROLES.GROSSISTE_PARTNER,
  ROLES.PLATFORM_ADMIN,
]

/**
 * Vérifie si un rôle donné a la permission d'effectuer une action sur un module
 *
 * @param role - Nom du rôle (ex: 'ADMIN', 'PHARMACIEN')
 * @param module - Module cible (ex: 'M01_STOCK')
 * @param action - Action demandée ('read', 'write', 'delete')
 * @returns true si l'accès est autorisé, false sinon
 */
export function checkPermission(role: string, module: string, action: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role]
  if (!rolePermissions) return false

  const modulePermissions = rolePermissions[module]
  if (!modulePermissions) return false

  return modulePermissions[action as keyof typeof modulePermissions] === true
}

/**
 * Récupère toutes les permissions d'un rôle
 *
 * @param role - Nom du rôle
 * @returns L'ensemble des permissions du rôle ou null si le rôle n'existe pas
 */
export function getRolePermissions(role: string): PermissionSet | null {
  return ROLE_PERMISSIONS[role] ?? null
}

/**
 * Vérifie si un rôle est un rôle institutionnel
 */
export function isInstitutionalRole(role: string): boolean {
  return INSTITUTIONAL_ROLES.includes(role)
}

/**
 * Vérifie si un rôle est un rôle de pharmacie
 */
export function isPharmacieRole(role: string): boolean {
  return PHARMACIE_ROLES.includes(role)
}

/**
 * Vérifie si un rôle est un rôle grossiste
 */
export function isGrossisteRole(role: string): boolean {
  return GROSSISTE_ROLES.includes(role)
}

/**
 * Wrapper pour les routes API nécessitant une permission spécifique
 *
 * @param handler - Fonction handler de la route API
 * @param requiredModule - Module requis (ex: 'M01_STOCK')
 * @param requiredAction - Action requise ('read', 'write', 'delete')
 * @returns Handler wrappé avec vérification RBAC
 *
 * @example
 * ```ts
 * export const POST = withAuth(async (request, { user }) => {
 *   // Logique métier...
 * }, 'M01_STOCK', 'write')
 * ```
 */
export function withAuth(
  handler: (request: Request, context: { user: AuthUser; params?: Record<string, string> }) => Promise<Response>,
  requiredModule: string,
  requiredAction: string
) {
  return async (request: Request, context?: { params?: Record<string, string> }) => {
    // Import dynamique pour éviter la dépendance circulaire
    const { getAuthUser } = await import('@/lib/api-auth')

    const user = await getAuthUser(request)

    if (!user) {
      return Response.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    if (!checkPermission(user.roleName, requiredModule, requiredAction)) {
      return Response.json(
        { error: `Accès refusé : permission ${requiredAction} sur ${requiredModule} requise` },
        { status: 403 }
      )
    }

    return handler(request, { user, params: context?.params })
  }
}

// === Types exportés ===

export interface AuthUser {
  id: string
  email: string
  nom: string
  prenom: string
  roleId: string
  roleName: string
  pharmacieId: string
  pharmacieNom: string
  avatarUrl?: string
  permissions: Array<{
    module: string
    action: string
    code: string
  }>
}
