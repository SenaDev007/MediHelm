import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './database/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { HealthModule } from './modules/health/health.module'
import { MedicamentsModule } from './modules/medicaments/medicaments.module'
import { InstitutionalModule } from './modules/institutionnel/institutionnel.module'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    MedicamentsModule,
    InstitutionalModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
