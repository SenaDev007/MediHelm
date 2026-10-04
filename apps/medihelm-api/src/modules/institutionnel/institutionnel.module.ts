import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { InstitutionTenantGuard } from '../../common/authorization/institution-tenant.guard'
import { PharmacyTenantGuard } from '../../common/authorization/pharmacy-tenant.guard'
import { RolesGuard } from '../../common/authorization/roles.guard'
import { InstitutionalController } from './institutionnel.controller'
import { InstitutionalService } from './institutionnel.service'
import { SoBapsPharmacyController } from './sobaps-pharmacy.controller'

@Module({
  imports: [AuthModule],
  controllers: [InstitutionalController, SoBapsPharmacyController],
  providers: [InstitutionalService, InstitutionTenantGuard, PharmacyTenantGuard, RolesGuard],
  exports: [InstitutionalService],
})
export class InstitutionalModule {}
