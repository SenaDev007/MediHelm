export type RoleType =
  | 'PLATFORM_ADMIN'
  | 'OWNER'
  | 'PROMOTEUR'
  | 'DIRECTEUR'
  | 'PHARMACIEN'
  | 'CAISSIER'
  | 'MAGASINIER'
  | 'COMPTABLE'
  | 'STAGIAIRE'
  | 'DPMED_ADMIN'
  | 'SOBAPS_VIEWER'
  | 'ABRP_VIEWER'
  | 'GROSSISTE_ADMIN'
  | 'GROSSISTE_COMMANDES'
  | 'GROSSISTE_PREPARATEUR'
  | 'GROSSISTE_LIVREUR'
  | 'GROSSISTE_COMMERCIAL'
  | 'GROSSISTE_COMPTABLE'
  | 'GROSSISTE_PARTNER'
  | 'PATIENT'

export type TenantType = 'PHARMACIE' | 'GROSSISTE' | 'INSTITUTIONNEL'
export type LegacyTenantType = 'INSTITUTION' | 'PLATFORM'
export type InstitutionType = 'DPMED' | 'SOBAPS' | 'ABRP'
export type PlanType = 'SEED' | 'GROW' | 'LEAD' | 'NETWORK'
export type LegacyPlanType = 'SEED' | 'BLOOM' | 'CROWN' | 'NETWORK'
export type TokenTenantType = TenantType | LegacyTenantType

export interface JWTPayload {
  sub: string
  pharmacieId?: string
  grossisteId?: string
  institutionId?: string
  institutionType?: InstitutionType
  role: RoleType
  tenantType: TokenTenantType
  pharmacieNom?: string
  prenom?: string
  iat: number
  exp: number
}

export interface APIResponse<T> {
  data: T
  meta?: Record<string, unknown>
  error?: string
}

export interface PortalUrls {
  app?: string
  grossiste?: string
  institutionnel?: string
  admin?: string
}
