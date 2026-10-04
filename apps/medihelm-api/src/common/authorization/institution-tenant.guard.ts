import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import type { AuthClaims } from '../auth/jwt-auth.guard'

const EXPECTED_ROLE: Readonly<Record<string, string>> = {
  DPMED: 'DPMED_ADMIN',
  SOBAPS: 'SOBAPS_VIEWER',
  ABRP: 'ABRP_VIEWER',
}

interface AuthenticatedRequest {
  user?: AuthClaims
}

@Injectable()
export class InstitutionTenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user
    if (!user) throw new UnauthorizedException('Authentification requise')
    if (
      user.tenantType !== 'INSTITUTIONNEL' ||
      !user.institutionId ||
      !user.institutionType ||
      EXPECTED_ROLE[user.institutionType] !== user.role
    ) {
      throw new ForbiddenException('Un compte institutionnel correspondant est requis')
    }

    const persisted = await this.prisma.institutionUser.findUnique({
      where: { id: user.sub },
      select: {
        institutionId: true,
        role: true,
        actif: true,
        institution: { select: { code: true, actif: true } },
      },
    })
    if (
      !persisted ||
      !persisted.actif ||
      !persisted.institution.actif ||
      persisted.institutionId !== user.institutionId ||
      persisted.institution.code !== user.institutionType ||
      persisted.role !== user.role
    ) {
      throw new ForbiddenException('Le compte institutionnel est désactivé ou son tenant ne correspond pas')
    }
    return true
  }
}
