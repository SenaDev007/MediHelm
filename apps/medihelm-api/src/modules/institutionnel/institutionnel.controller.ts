import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import type { RoleType } from '@medihelm/types'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { InstitutionTenantGuard } from '../../common/authorization/institution-tenant.guard'
import { RequireRoles } from '../../common/authorization/roles.decorator'
import { RolesGuard } from '../../common/authorization/roles.guard'
import {
  CreateDpmedAlertDto,
  CreateSurveillanceDto,
  DciSheetDto,
  InstitutionListQueryDto,
  UpdateDciSheetDto,
  UpdateDpmedAlertDto,
  UpdateSurveillanceDto,
} from './institutionnel.dto'
import { InstitutionalService } from './institutionnel.service'

const DPMED: RoleType[] = ['DPMED_ADMIN']
const SOBAPS: RoleType[] = ['SOBAPS_VIEWER']

@Controller('institutionnel')
@UseGuards(JwtAuthGuard, InstitutionTenantGuard, RolesGuard)
export class InstitutionalController {
  constructor(private readonly service: InstitutionalService) {}

  @Get('dpmed/dashboard')
  @RequireRoles(...DPMED)
  dpmedDashboard() {
    return this.service.getDpmedDashboard()
  }

  @Get('dpmed/alertes')
  @RequireRoles(...DPMED)
  listAlerts(@Query() query: InstitutionListQueryDto) {
    return this.service.listDpmedAlerts(query)
  }

  @Get('dpmed/alertes/:id')
  @RequireRoles(...DPMED)
  getAlert(@Param('id') id: string) {
    return this.service.getDpmedAlert(id)
  }

  @Post('dpmed/alertes')
  @RequireRoles(...DPMED)
  createAlert(@Body() input: CreateDpmedAlertDto) {
    return this.service.createDpmedAlert(input)
  }

  @Patch('dpmed/alertes/:id')
  @RequireRoles(...DPMED)
  updateAlert(@Param('id') id: string, @Body() input: UpdateDpmedAlertDto) {
    return this.service.updateDpmedAlert(id, input)
  }

  @Delete('dpmed/alertes/:id')
  @RequireRoles(...DPMED)
  cancelAlert(@Param('id') id: string) {
    return this.service.cancelDpmedAlert(id)
  }

  @Post('dpmed/alertes/:id/publier')
  @RequireRoles(...DPMED)
  publishAlert(@Param('id') id: string) {
    return this.service.publishDpmedAlert(id)
  }

  @Get('dpmed/signalements-ei')
  @RequireRoles(...DPMED)
  listSignalements(@Query() query: InstitutionListQueryDto) {
    return this.service.listDpmedSignalements(query)
  }

  @Get('dpmed/conformite')
  @RequireRoles(...DPMED)
  compliance(@Query() query: InstitutionListQueryDto) {
    return this.service.getDpmedCompliance(query)
  }

  @Get('dpmed/medicaments-surveillance')
  @RequireRoles(...DPMED)
  listSurveillance(@Query() query: InstitutionListQueryDto) {
    return this.service.listSurveillance(query)
  }

  @Get('dpmed/medicaments-surveillance/:id')
  @RequireRoles(...DPMED)
  getSurveillance(@Param('id') id: string) {
    return this.service.getSurveillance(id)
  }

  @Post('dpmed/medicaments-surveillance')
  @RequireRoles(...DPMED)
  createSurveillance(@Body() input: CreateSurveillanceDto) {
    return this.service.createSurveillance(input)
  }

  @Patch('dpmed/medicaments-surveillance/:id')
  @RequireRoles(...DPMED)
  updateSurveillance(@Param('id') id: string, @Body() input: UpdateSurveillanceDto) {
    return this.service.updateSurveillance(id, input)
  }

  @Delete('dpmed/medicaments-surveillance/:id')
  @RequireRoles(...DPMED)
  archiveSurveillance(@Param('id') id: string) {
    return this.service.archiveSurveillance(id)
  }

  @Get('dpmed/fiches-dci')
  @RequireRoles(...DPMED)
  listDciSheets(@Query() query: InstitutionListQueryDto) {
    return this.service.listDciSheets(query)
  }

  @Get('dpmed/fiches-dci/:id')
  @RequireRoles(...DPMED)
  getDciSheet(@Param('id') id: string) {
    return this.service.getDciSheet(id)
  }

  @Post('dpmed/fiches-dci')
  @RequireRoles(...DPMED)
  createDciSheet(@Body() input: DciSheetDto) {
    return this.service.createDciSheet(input)
  }

  @Patch('dpmed/fiches-dci/:id')
  @RequireRoles(...DPMED)
  updateDciSheet(@Param('id') id: string, @Body() input: UpdateDciSheetDto) {
    return this.service.updateDciSheet(id, input)
  }

  @Delete('dpmed/fiches-dci/:id')
  @RequireRoles(...DPMED)
  archiveDciSheet(@Param('id') id: string) {
    return this.service.archiveDciSheet(id)
  }

  @Get('sobaps/dashboard')
  @RequireRoles(...SOBAPS)
  sobapsDashboard() {
    return this.service.getSobapsDashboard()
  }

  @Get('sobaps/livraisons')
  @RequireRoles(...SOBAPS)
  sobapsDeliveries(@Query() query: InstitutionListQueryDto) {
    return this.service.listSobapsDeliveries(query)
  }

  @Get('sobaps/confirmations')
  @RequireRoles(...SOBAPS)
  sobapsConfirmations(@Query() query: InstitutionListQueryDto) {
    return this.service.listSobapsDeliveries(query)
  }
}
