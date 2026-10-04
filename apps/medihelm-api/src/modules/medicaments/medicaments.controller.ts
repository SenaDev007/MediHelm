import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import type { RoleType } from '@medihelm/types'
import { CurrentAuthUser } from '../../common/auth/current-user.decorator'
import { AuthClaims, JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { PharmacyTenantGuard } from '../../common/authorization/pharmacy-tenant.guard'
import { RequireRoles } from '../../common/authorization/roles.decorator'
import { RolesGuard } from '../../common/authorization/roles.guard'
import { CreateMedicamentDto, MedicamentQueryDto, UpdateMedicamentDto } from './medicament.dto'
import { MedicamentsService } from './medicaments.service'

const READ_ROLES: RoleType[] = [
  'OWNER', 'DIRECTEUR', 'PHARMACIEN', 'CAISSIER', 'MAGASINIER', 'COMPTABLE', 'STAGIAIRE', 'PROMOTEUR',
]
const WRITE_ROLES: RoleType[] = ['OWNER', 'DIRECTEUR', 'PHARMACIEN', 'MAGASINIER']

@Controller('medicaments')
@UseGuards(JwtAuthGuard, PharmacyTenantGuard, RolesGuard)
@RequireRoles(...READ_ROLES)
export class MedicamentsController {
  constructor(private readonly medicaments: MedicamentsService) {}

  @Get()
  list(@CurrentAuthUser() user: AuthClaims, @Query() query: MedicamentQueryDto) {
    return this.medicaments.list(user.pharmacieId!, query)
  }

  @Get(':id')
  getById(@CurrentAuthUser() user: AuthClaims, @Param('id') id: string) {
    return this.medicaments.getById(user.pharmacieId!, id)
  }

  @Post()
  @RequireRoles(...WRITE_ROLES)
  create(@CurrentAuthUser() user: AuthClaims, @Body() body: CreateMedicamentDto) {
    return this.medicaments.create(user.pharmacieId!, body)
  }

  @Patch(':id')
  @RequireRoles(...WRITE_ROLES)
  update(
    @CurrentAuthUser() user: AuthClaims,
    @Param('id') id: string,
    @Body() body: UpdateMedicamentDto,
  ) {
    return this.medicaments.update(user.pharmacieId!, id, body)
  }

  @Delete(':id')
  @RequireRoles('OWNER')
  archive(@CurrentAuthUser() user: AuthClaims, @Param('id') id: string) {
    return this.medicaments.archive(user.pharmacieId!, id)
  }
}
