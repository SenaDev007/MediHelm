import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { NiveauRisque, NiveauUrgence, TypeAlerteDPMED, TypeSurveillance } from '@medihelm/database'

export class InstitutionListQueryDto {
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
}

export class CreateDpmedAlertDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  titre!: string

  @IsEnum(TypeAlerteDPMED)
  typeAlerte!: TypeAlerteDPMED

  @IsEnum(NiveauUrgence)
  niveauUrgence!: NiveauUrgence

  @IsOptional()
  @IsString()
  @MaxLength(160)
  dciConcernee?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  lotsCibles: string[] = []

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string
}

export class UpdateDpmedAlertDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  titre?: string

  @IsOptional()
  @IsEnum(TypeAlerteDPMED)
  typeAlerte?: TypeAlerteDPMED

  @IsOptional()
  @IsEnum(NiveauUrgence)
  niveauUrgence?: NiveauUrgence

  @IsOptional()
  @IsString()
  @MaxLength(160)
  dciConcernee?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  lotsCibles?: string[]

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description?: string
}

export class CreateSurveillanceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  dci!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nomCommercial?: string

  @IsEnum(TypeSurveillance)
  typeSurveillance!: TypeSurveillance

  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  description!: string

  @IsOptional()
  @IsDateString()
  dateEmission?: string

  @IsEnum(NiveauRisque)
  niveauRisque!: NiveauRisque

  @IsOptional()
  @IsString()
  @MaxLength(40)
  statut?: string
}

export class UpdateSurveillanceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  dci?: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nomCommercial?: string

  @IsOptional()
  @IsEnum(TypeSurveillance)
  typeSurveillance?: TypeSurveillance

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  description?: string

  @IsOptional()
  @IsDateString()
  dateEmission?: string

  @IsOptional()
  @IsEnum(NiveauRisque)
  niveauRisque?: NiveauRisque

  @IsOptional()
  @IsString()
  @MaxLength(40)
  statut?: string
}

export class DciSheetDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  dci!: string

  @IsOptional()
  @IsString()
  @MaxLength(180)
  classeTherapeutique?: string

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  mecanisme?: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  indications?: string

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  posologie?: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  contreIndications?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  interactions?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  effetsIndesirables?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conservation?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  source?: string

  @IsOptional()
  @IsBoolean()
  actif?: boolean
}

export class UpdateDciSheetDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  dci?: string

  @IsOptional()
  @IsString()
  @MaxLength(180)
  classeTherapeutique?: string

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  mecanisme?: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  indications?: string

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  posologie?: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  contreIndications?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  interactions?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  effetsIndesirables?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conservation?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  source?: string

  @IsOptional()
  @IsBoolean()
  actif?: boolean
}

export class SoBapsReceiptLineDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  dci!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nomCommercial?: string

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  numeroLot!: string

  @IsDateString()
  dateExpiration!: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  quantiteAttendue!: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  quantiteRecue!: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motifEcart?: string
}

export class CreateSoBapsReceiptDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  referenceBL!: string

  @IsDateString()
  dateLivraison!: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SoBapsReceiptLineDto)
  lignes!: SoBapsReceiptLineDto[]
}

export class UpdateSoBapsReceiptDto {
  @IsOptional()
  @IsDateString()
  dateLivraison?: string

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SoBapsReceiptLineDto)
  lignes?: SoBapsReceiptLineDto[]
}
