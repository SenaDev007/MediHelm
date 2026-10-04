import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthClaims } from './jwt-auth.guard'

interface AuthenticatedRequest {
  user?: AuthClaims
}

export const CurrentAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthClaims => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!request.user) throw new Error('CurrentAuthUser requires JwtAuthGuard')
    return request.user
  },
)
