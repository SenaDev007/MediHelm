import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import type { AuthClaims } from '../auth/jwt-auth.guard'

interface AuthenticatedRequest {
  user?: AuthClaims
}

@Injectable()
export class PharmacyTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user
    if (!user) throw new UnauthorizedException('Authentification requise')
    if (user.tenantType !== 'PHARMACIE' || !user.pharmacieId) {
      throw new ForbiddenException('Cette opération requiert un compte pharmacie')
    }
    return true
  }
}
