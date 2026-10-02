import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'

const JWT_ISSUER = 'medihelm-api'
const JWT_AUDIENCE = 'medihelm-client'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32 || /^(replace|change|your[-_])/i.test(secret)) {
    throw new Error('JWT_SECRET must be configured with at least 32 non-placeholder bytes')
  }
  return secret
}

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: 900,
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
