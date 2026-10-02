import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../database/prisma.service'
import { hashPassword, performDummyPasswordCheck, verifyPassword } from './password'
import type { LoginDto } from './login.dto'

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: LoginDto) {
    const email = input.email.trim().toLowerCase()
    const user = await this.prisma.utilisateur.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        motDePasse: true,
        actif: true,
        pharmacieId: true,
        pharmacie: { select: { nom: true, actif: true } },
      },
    })

    if (!user) {
      await performDummyPasswordCheck(input.password)
      throw new UnauthorizedException('Email ou mot de passe incorrect')
    }

    const passwordValid = await verifyPassword(input.password, user.motDePasse)
    if (!passwordValid || !user.actif || !user.pharmacie.actif) {
      throw new UnauthorizedException('Email ou mot de passe incorrect')
    }

    const updates: { dernierLogin: Date; motDePasse?: string } = { dernierLogin: new Date() }
    if (!/^\$2[aby]\$/.test(user.motDePasse)) {
      updates.motDePasse = await hashPassword(input.password)
    }
    await this.prisma.utilisateur.update({ where: { id: user.id }, data: updates })

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      tenantType: 'PHARMACIE',
      pharmacieId: user.pharmacieId,
      pharmacieNom: user.pharmacie.nom,
      prenom: user.prenom,
    })

    return {
      data: {
        token: accessToken,
        tokenType: 'Bearer' as const,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          pharmacieId: user.pharmacieId,
          pharmacieNom: user.pharmacie.nom,
        },
      },
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        pharmacieId: true,
        pharmacie: { select: { id: true, nom: true, actif: true } },
      },
    })

    if (!user || !user.actif || !user.pharmacie.actif) {
      throw new ForbiddenException('Compte ou pharmacie désactivé')
    }

    return {
      data: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        tenantType: 'PHARMACIE' as const,
        pharmacieId: user.pharmacie.id,
        pharmacieNom: user.pharmacie.nom,
      },
    }
  }
}
