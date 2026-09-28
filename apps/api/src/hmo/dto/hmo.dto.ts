import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
} from "class-validator";

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  contactName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;
}

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  /** The insurer's share of each bill; the remainder is the co-payment. */
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  coveragePercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  annualLimit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  perVisitLimit?: number;

  @IsBoolean()
  @IsOptional()
  requiresPreAuth?: boolean;
}

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  contractNumber: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  paymentTermsDays?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class EnrolPatientDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  memberNumber: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsBoolean()
  @IsOptional()
  isPrincipal?: boolean;
}

export class BuildClaimDto {
  @IsString()
  @IsNotEmpty()
  encounterId: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  preAuthCode?: string;
}

export class AdjudicateClaimDto {
  /** Zero means fully declined, which is why a reason is then required. */
  @IsNumber()
  @Min(0)
  approvedAmount: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class RecordRemittanceDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  reference?: string;
}
