import { InsuranceClaimStatus } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

/**
 * Ad-hoc insurance claims, for insurers not in the payer registry.
 *
 * The amounts are money, so they are numbers and never negative. Off an
 * untyped body a string amount reached a Decimal column, and a negative one
 * was accepted outright — a claim for less than nothing.
 */
export class CreateInsuranceClaimDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  provider: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  scheme?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  memberNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  preAuthCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateInsuranceClaimStatusDto {
  @IsEnum(InsuranceClaimStatus)
  status: InsuranceClaimStatus;

  /** What the insurer actually agreed to pay, which is often not what was claimed. */
  @IsNumber()
  @Min(0)
  @IsOptional()
  approvedAmount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  rejectionReason?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
