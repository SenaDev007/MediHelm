import { SetMetadata } from '@nestjs/common'
import type { RoleType } from '@medihelm/types'

export const REQUIRED_ROLES_KEY = 'medihelm:required-roles'
export const RequireRoles = (...roles: RoleType[]) => SetMetadata(REQUIRED_ROLES_KEY, roles)
