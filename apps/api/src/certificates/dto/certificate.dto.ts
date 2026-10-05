import { CertificateStatus, CertificateType } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/**
 * Medical certificates — sick leave, fitness to work, and death certificates.
 *
 * One endpoint covers every type, so most fields are optional: a death
 * certificate needs a place of death and a sick note needs days off, and
 * neither needs the other's. What is validated is that whatever is sent is of
 * the right kind — the dates are dates, the day count is a bounded integer,
 * and the type is one the system issues.
 */
export class CreateCertificateDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsEnum(CertificateType)
  type: CertificateType;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  diagnosis?: string;

  /* ── Sick leave and fitness to work ───────────────────────────────── */

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  /** Bounded: a sick note for 10,000 days is a typo, not a prognosis. */
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  daysOff?: number;

  @IsBoolean()
  @IsOptional()
  fittedForDuty?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  restrictions?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  /* ── Death certificate ────────────────────────────────────────────── */

  @IsString()
  @IsOptional()
  @MaxLength(200)
  deceasedName?: string;

  @IsDateString()
  @IsOptional()
  deathDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  placeOfDeath?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  causeOfDeath?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateCertificateStatusDto {
  @IsEnum(CertificateStatus)
  status: CertificateStatus;
}

/**
 * Revoking a certificate.
 *
 * The reason is required: a revoked medical certificate with no recorded
 * reason is a gap in the very record it exists to be. Read off an `any` body
 * it was simply `undefined` and stored as nothing.
 */
export class RevokeCertificateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  revokedReason: string;
}
