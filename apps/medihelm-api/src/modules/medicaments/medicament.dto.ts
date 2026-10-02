import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { CategorieATC, FormeGalenique } from '@medihelm/database'

export class CreateMedicamentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  dci!: string

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nomCommercial!: string

  @IsOptional()
  @IsEnum(FormeGalenique)
  forme?: FormeGalenique

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  dosage!: string

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  prixPublic!: number

  @IsOptional()
  @IsBoolean()
  surOrdonnance?: boolean

  @IsOptional()
  @IsBoolean()
  estStupefiant?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stockMinimum?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stockSecurite?: number

  @IsOptional()
  @IsEnum(CategorieATC)
  categorieAtc?: CategorieATC

  @IsOptional()
  @IsBoolean()
  remboursable?: boolean

  @IsOptional()
  @IsBoolean()
  generique?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(128)
  codeBarres?: string
}

export class UpdateMedicamentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  dci?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nomCommercial?: string

  @IsOptional()
  @IsEnum(FormeGalenique)
  forme?: FormeGalenique

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  dosage?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  prixPublic?: number

  @IsOptional()
  @IsBoolean()
  surOrdonnance?: boolean

  @IsOptional()
  @IsBoolean()
  estStupefiant?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stockMinimum?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stockSecurite?: number

  @IsOptional()
  @IsEnum(CategorieATC)
  categorieAtc?: CategorieATC

  @IsOptional()
  @IsBoolean()
  remboursable?: boolean

  @IsOptional()
  @IsBoolean()
  generique?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(128)
  codeBarres?: string
}

function parseBoolean(value: unknown): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}

export class MedicamentQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  dci?: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nomCommercial?: string

  @IsOptional()
  @IsEnum(FormeGalenique)
  forme?: FormeGalenique

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  actif?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20

  @IsOptional()
  @IsIn(['nomCommercial', 'dci', 'createdAt', 'updatedAt', 'prixPublic'])
  sortBy: 'nomCommercial' | 'dci' | 'createdAt' | 'updatedAt' | 'prixPublic' = 'nomCommercial'

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc'
}
