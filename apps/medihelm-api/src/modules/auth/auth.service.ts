import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../database/prisma.service'
import type { AuthClaims } from '../../common/auth/jwt-auth.guard'
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
    if (input.tenantType === 'INSTITUTIONNEL') return this.loginInstitution(input)
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

  private async loginInstitution(input: LoginDto) {
    const email = input.email.trim().toLowerCase()
    const user = await this.prisma.institutionUser.findUnique({
      where: { email },
      include: { institution: true },
    })

    if (!user) {
      await performDummyPasswordCheck(input.password)
      throw new UnauthorizedException('Email ou mot de passe incorrect')
    }

    const passwordValid = await verifyPassword(input.password, user.motDePasse)
    const expectedRole: Record<string, string> = {
      DPMED: 'DPMED_ADMIN',
      SOBAPS: 'SOBAPS_VIEWER',
      ABRP: 'ABRP_VIEWER',
    }
    if (
      !passwordValid ||
      !user.actif ||
      !user.institution.actif ||
      expectedRole[user.institution.code] !== user.role
    ) {
      throw new UnauthorizedException('Email ou mot de passe incorrect')
    }

    const updates: { dernierLogin: Date; motDePasse?: string } = { dernierLogin: new Date() }
    if (!/^\$2[aby]\$/.test(user.motDePasse)) {
      updates.motDePasse = await hashPassword(input.password)
    }
    await this.prisma.institutionUser.update({ where: { id: user.id }, data: updates })

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      tenantType: 'INSTITUTIONNEL',
      institutionId: user.institutionId,
      institutionType: user.institution.code,
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
          tenantType: 'INSTITUTIONNEL' as const,
          institutionId: user.institutionId,
          institutionType: user.institution.code,
          institutionNom: user.institution.nom,
        },
      },
    }
  }

  async getProfile(claims: AuthClaims) {
    if (claims.tenantType === 'INSTITUTIONNEL') {
      const user = await this.prisma.institutionUser.findUnique({
        where: { id: claims.sub },
        include: { institution: true },
      })
      if (!user || !user.actif || !user.institution.actif || user.institutionId !== claims.institutionId) {
        throw new ForbiddenException('Compte institutionnel désactivé ou invalide')
      }
      return {
        data: {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          tenantType: 'INSTITUTIONNEL' as const,
          institutionId: user.institutionId,
          institutionType: user.institution.code,
          institutionNom: user.institution.nom,
        },
      }
    }

    const user = await this.prisma.utilisateur.findUnique({
      where: { id: claims.sub },
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
