import { DischargeType } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

/**
 * Discharging a patient: the summary they leave with.
 *
 * Both bodies were typed `any`. The follow-up date matters beyond this record —
 * patient recall reads it to chase people who were told to come back — so a
 * malformed one was accepted here and became a follow-up that never happened.
 */
export class CreateDischargeRecordDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsOptional()
  bedId?: string;

  /** REGULAR, AMA, TRANSFER, DEATH or ABSCONDED — not interchangeable. */
  @IsEnum(DischargeType)
  dischargeType: DischargeType;

  @IsDateString()
  @IsOptional()
  admittedAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  dischargeNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  followUpInstructions?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  medicationsOnDischarge?: string;

  /** Read by patient recall to chase a patient who was told to come back. */
  @IsDateString()
  @IsOptional()
  followUpDate?: string;
}

export class CompleteDischargeRecordDto {
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  dischargeNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  followUpInstructions?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  medicationsOnDischarge?: string;

  @IsDateString()
  @IsOptional()
  followUpDate?: string;
}
