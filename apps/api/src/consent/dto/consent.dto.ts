import { ConsentStatus, ConsentType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Consent forms: what a patient agreed to, and who witnessed it.
 *
 * All four bodies were typed `any`. A consent record is the document relied on
 * if a procedure is ever questioned, so a request that failed to say which
 * patient or which procedure returning 500 "Internal server error" — rather
 * than naming the missing field — was the worst place for it.
 */
export class CreateConsentFormDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsEnum(ConsentType)
  consentType: ConsentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  procedureName: string;

  /** The wording the patient actually agreed to, kept verbatim. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  consentText: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class SignConsentFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  witnessName: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  witnessRelation?: string;
}

export class RevokeConsentFormDto {
  /** Why consent was withdrawn. Required: a revocation with no reason is a gap. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

export class UpdateConsentStatusDto {
  @IsEnum(ConsentStatus)
  status: ConsentStatus;
}
