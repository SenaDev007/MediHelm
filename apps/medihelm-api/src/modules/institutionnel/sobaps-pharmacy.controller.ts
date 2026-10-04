import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import type { RoleType } from '@medihelm/types'
import { CurrentAuthUser } from '../../common/auth/current-user.decorator'
import { AuthClaims, JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { PharmacyTenantGuard } from '../../common/authorization/pharmacy-tenant.guard'
import { RequireRoles } from '../../common/authorization/roles.decorator'
import { RolesGuard } from '../../common/authorization/roles.guard'
import { CreateSoBapsReceiptDto, InstitutionListQueryDto, UpdateSoBapsReceiptDto } from './institutionnel.dto'
import { InstitutionalService } from './institutionnel.service'

const READ_ROLES: RoleType[] = ['OWNER', 'DIRECTEUR', 'PHARMACIEN', 'MAGASINIER']
const WRITE_ROLES: RoleType[] = ['OWNER', 'DIRECTEUR', 'PHARMACIEN', 'MAGASINIER']

@Controller('sobaps/receptions')
@UseGuards(JwtAuthGuard, PharmacyTenantGuard, RolesGuard)
@RequireRoles(...READ_ROLES)
export class SoBapsPharmacyController {
  constructor(private readonly service: InstitutionalService) {}

  @Get()
  list(@CurrentAuthUser() user: AuthClaims, @Query() query: InstitutionListQueryDto) {
    return this.service.listPharmacyReceipts(user.pharmacieId!, query)
  }

  @Get(':id')
  get(@CurrentAuthUser() user: AuthClaims, @Param('id') id: string) {
    return this.service.getPharmacyReceipt(user.pharmacieId!, id)
  }

  @Post()
  @RequireRoles(...WRITE_ROLES)
  create(@CurrentAuthUser() user: AuthClaims, @Body() input: CreateSoBapsReceiptDto) {
    return this.service.createPharmacyReceipt(user.pharmacieId!, input)
  }

  @Patch(':id')
  @RequireRoles(...WRITE_ROLES)
  update(
    @CurrentAuthUser() user: AuthClaims,
    @Param('id') id: string,
    @Body() input: UpdateSoBapsReceiptDto,
  ) {
    return this.service.updatePharmacyReceipt(user.pharmacieId!, id, input)
  }

  @Post(':id/confirmer')
  @RequireRoles(...WRITE_ROLES)
  confirm(@CurrentAuthUser() user: AuthClaims, @Param('id') id: string) {
    return this.service.confirmPharmacyReceipt(user.pharmacieId!, id)
  }

  @Delete(':id')
  @RequireRoles(...WRITE_ROLES)
  cancel(@CurrentAuthUser() user: AuthClaims, @Param('id') id: string) {
    return this.service.cancelPharmacyReceipt(user.pharmacieId!, id)
  }
}
