export const SESSION_COOKIE = 'medihelm_institution_session'

export interface InstitutionSession {
  id: string
  email: string
  nom: string
  prenom: string
  role: 'DPMED_ADMIN' | 'SOBAPS_VIEWER' | 'ABRP_VIEWER'
  tenantType: 'INSTITUTIONNEL'
  institutionId: string
  institutionType: 'DPMED' | 'SOBAPS' | 'ABRP'
  institutionNom?: string
}

const ROLE_BY_INSTITUTION: Record<string, string> = {
  DPMED: 'DPMED_ADMIN',
  SOBAPS: 'SOBAPS_VIEWER',
  ABRP: 'ABRP_VIEWER',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseInstitutionUser(value: unknown): InstitutionSession | null {
  const candidate = isRecord(value) && isRecord(value.data) ? value.data : value
  if (!isRecord(candidate)) return null
  const { id, email, nom, prenom, role, tenantType, institutionId, institutionType, institutionNom } = candidate
  if (
    typeof id !== 'string' ||
    typeof email !== 'string' ||
    typeof nom !== 'string' ||
    typeof prenom !== 'string' ||
    tenantType !== 'INSTITUTIONNEL' ||
    typeof institutionId !== 'string' ||
    typeof institutionType !== 'string' ||
    (role !== 'DPMED_ADMIN' && role !== 'SOBAPS_VIEWER' && role !== 'ABRP_VIEWER') ||
    ROLE_BY_INSTITUTION[institutionType] !== role
  ) return null
  return {
    id,
    email,
    nom,
    prenom,
    role,
    tenantType,
    institutionId,
    institutionType: institutionType as InstitutionSession['institutionType'],
    ...(typeof institutionNom === 'string' ? { institutionNom } : {}),
  }
}

export async function authenticateInstitutionToken(token: string | undefined): Promise<InstitutionSession | null> {
  const apiBase = process.env.MEDIHELM_API_URL?.replace(/\/$/, '')
  if (!token || token.length > 8192 || !apiBase) return null
  try {
    const response = await fetch(`${apiBase}/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return null
    return parseInstitutionUser(await response.json())
  } catch {
    return null
  }
}
