import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { RoleType as DatabaseRoleType, TenantType as DatabaseTenantType } from '@medihelm/database'

const JWT_ISSUER = 'medihelm-api'
const JWT_AUDIENCE = 'medihelm-client'
const ROLE_VALUES: ReadonlySet<string> = new Set(Object.values(DatabaseRoleType))
const TENANT_VALUES: ReadonlySet<string> = new Set(Object.values(DatabaseTenantType))
const INSTITUTION_ROLE: Readonly<Record<string, string>> = {
  DPMED: 'DPMED_ADMIN',
  SOBAPS: 'SOBAPS_VIEWER',
  ABRP: 'ABRP_VIEWER',
}

export interface AuthClaims {
  sub: string
  role: string
  tenantType: string
  pharmacieId?: string
  grossisteId?: string
  institutionId?: string
  institutionType?: string
  pharmacieNom?: string
  prenom?: string
  iat: number
  exp: number
}

interface AuthenticatedRequest {
  headers: { authorization?: string | string[] }
  user?: AuthClaims
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAuthClaims(value: unknown): value is AuthClaims {
  if (!isRecord(value)) return false
  if (typeof value.sub !== 'string' || value.sub.length === 0) return false
  if (typeof value.role !== 'string' || !ROLE_VALUES.has(value.role)) return false
  if (typeof value.tenantType !== 'string' || !TENANT_VALUES.has(value.tenantType)) return false
  if (typeof value.iat !== 'number' || !Number.isFinite(value.iat)) return false
  if (typeof value.exp !== 'number' || !Number.isFinite(value.exp)) return false
  if (value.tenantType === 'PHARMACIE' && typeof value.pharmacieId !== 'string') return false
  if (value.pharmacieId !== undefined && typeof value.pharmacieId !== 'string') return false
  if (value.grossisteId !== undefined && typeof value.grossisteId !== 'string') return false
  if (value.pharmacieNom !== undefined && typeof value.pharmacieNom !== 'string') return false
  if (value.prenom !== undefined && typeof value.prenom !== 'string') return false

  if (value.tenantType === 'INSTITUTIONNEL') {
    if (typeof value.institutionId !== 'string' || value.institutionId.length === 0) return false
    if (typeof value.institutionType !== 'string') return false
    if (INSTITUTION_ROLE[value.institutionType] !== value.role) return false
  } else if (value.institutionId !== undefined || value.institutionType !== undefined) {
    return false
  }
  return true
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token requis')
    }

    const token = authorization.slice('Bearer '.length).trim()
    if (!token) throw new UnauthorizedException('Bearer token invalide')

    try {
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      })
      if (!isAuthClaims(payload)) throw new UnauthorizedException('Claims JWT invalides')
      request.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Bearer token invalide ou expiré')
    }
  }
}
