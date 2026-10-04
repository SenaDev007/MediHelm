import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CurrentAuthUser } from '../../common/auth/current-user.decorator'
import { AuthClaims, JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { AuthService } from './auth.service'
import { LoginDto } from './login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() body: LoginDto) {
    return this.authService.login(body)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentAuthUser() user: AuthClaims) {
    return this.authService.getProfile(user)
  }
}
