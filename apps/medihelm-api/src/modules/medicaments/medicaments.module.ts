import { Module } from '@nestjs/common'
import { PharmacyTenantGuard } from '../../common/authorization/pharmacy-tenant.guard'
import { RolesGuard } from '../../common/authorization/roles.guard'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { AuthModule } from '../auth/auth.module'
import { MedicamentsController } from './medicaments.controller'
import { MedicamentsService } from './medicaments.service'

@Module({
  imports: [AuthModule],
  controllers: [MedicamentsController],
  providers: [MedicamentsService, JwtAuthGuard, PharmacyTenantGuard, RolesGuard],
})
export class MedicamentsModule {}
