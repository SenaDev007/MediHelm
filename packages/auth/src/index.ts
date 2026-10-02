import type { JWTPayload, PortalUrls, RoleType, TokenTenantType } from '@medihelm/types'

const ROLE_SET = new Set<string>([
  'PLATFORM_ADMIN', 'OWNER', 'PROMOTEUR', 'DIRECTEUR', 'PHARMACIEN', 'CAISSIER',
  'MAGASINIER', 'COMPTABLE', 'STAGIAIRE', 'DPMED_ADMIN', 'SOBAPS_VIEWER',
  'ABRP_VIEWER', 'GROSSISTE_ADMIN', 'GROSSISTE_COMMANDES', 'GROSSISTE_PREPARATEUR',
  'GROSSISTE_LIVREUR', 'GROSSISTE_COMMERCIAL', 'GROSSISTE_COMPTABLE',
  'GROSSISTE_PARTNER', 'PATIENT',
])
const TENANT_SET = new Set<string>(['PHARMACIE', 'GROSSISTE', 'INSTITUTIONNEL', 'INSTITUTION', 'PLATFORM'])
const INSTITUTIONAL_ROLE_SET = new Set<string>(['DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRoleType(value: unknown): value is RoleType {
  return typeof value === 'string' && ROLE_SET.has(value)
}

function isTenantType(value: unknown): value is TokenTenantType {
  return typeof value === 'string' && TENANT_SET.has(value)
}

function isJwtPayload(value: unknown): value is JWTPayload {
  if (!isRecord(value)) return false
  return (
    typeof value.sub === 'string' &&
    isRoleType(value.role) &&
    isTenantType(value.tenantType) &&
    typeof value.iat === 'number' && Number.isFinite(value.iat) &&
    typeof value.exp === 'number' && Number.isFinite(value.exp) &&
    (value.pharmacieId === undefined || typeof value.pharmacieId === 'string') &&
    (value.grossisteId === undefined || typeof value.grossisteId === 'string')
  )
}

/**
 * Decode claims for client-side display and navigation only.
 * This does not verify the JWT signature and must never authorize a request.
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const candidate: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return isJwtPayload(candidate) ? candidate : null
  } catch {
    return null
  }
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  const payload = decodeJWT(token)
  return !payload || payload.exp * 1000 <= now
}

export function getStoredToken(key = 'mh-token'): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

export function setStoredToken(token: string, key = 'mh-token'): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, token)
}

export function clearStoredToken(key = 'mh-token'): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

export function getRedirectUrl(payload: JWTPayload, urls: PortalUrls = {}): string {
  const appUrl = urls.app ?? 'http://localhost:3001'
  const grossisteUrl = urls.grossiste ?? 'http://localhost:3002'
  const institutionalUrl = urls.institutionnel ?? 'http://localhost:3003'
  const adminUrl = urls.admin ?? 'http://localhost:3004'

  if (payload.role === 'PLATFORM_ADMIN' || payload.tenantType === 'PLATFORM') {
    return `${adminUrl.replace(/\/$/, '')}/dashboard`
  }
  if (payload.tenantType === 'GROSSISTE') return `${grossisteUrl.replace(/\/$/, '')}/dashboard`
  if (payload.tenantType === 'INSTITUTIONNEL' || payload.tenantType === 'INSTITUTION' || INSTITUTIONAL_ROLE_SET.has(payload.role)) {
    return `${institutionalUrl.replace(/\/$/, '')}/dashboard`
  }
  return `${appUrl.replace(/\/$/, '')}/dashboard`
}
