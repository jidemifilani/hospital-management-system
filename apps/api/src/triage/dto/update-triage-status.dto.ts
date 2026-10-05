import { TriageStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Moving a triage record along, and where the patient went.
 *
 * `create` already had a DTO; this one did not, so the status was whatever was
 * sent.
 */
export class UpdateTriageStatusDto {
  @IsEnum(TriageStatus)
  status: TriageStatus;

  /** Where they were sent — admitted, discharged, referred on. */
  @IsString()
  @IsOptional()
  @MaxLength(500)
  disposition?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
