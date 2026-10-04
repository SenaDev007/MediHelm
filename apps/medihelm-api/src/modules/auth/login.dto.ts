import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string

  @IsOptional()
  @IsIn(['PHARMACIE', 'INSTITUTIONNEL'])
  tenantType?: 'PHARMACIE' | 'INSTITUTIONNEL'
}
