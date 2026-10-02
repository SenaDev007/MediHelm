import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { RoleType } from '@medihelm/types'
import type { AuthClaims } from '../auth/jwt-auth.guard'
import { REQUIRED_ROLES_KEY } from './roles.decorator'

interface AuthenticatedRequest {
  user?: AuthClaims
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles?.length) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!request.user) throw new UnauthorizedException('Authentification requise')
    if (!requiredRoles.includes(request.user.role as RoleType)) {
      throw new ForbiddenException('Rôle insuffisant pour cette opération')
    }
    return true
  }
}
