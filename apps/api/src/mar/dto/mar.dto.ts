import { MARStatus, MedicationRoute } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

/**
 * The medication administration record: what was given, to whom, and when.
 *
 * All three bodies were typed `any`, so the validation pipe had nothing to
 * check and a request missing the drug name or the dose reached Prisma and came
 * back 500 "Internal server error". On this of all records, a caller deserves
 * to be told which field it left out.
 */
export class CreateMarRecordDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsOptional()
  prescriptionId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medicationName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dose: string;

  @IsEnum(MedicationRoute)
  route: MedicationRoute;

  /** When it is due. Required: a dose with no time is not a schedule. */
  @IsDateString()
  scheduledTime: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class AdministerMarRecordDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class SkipMarRecordDto {
  /**
   * Why it was not given. Optional here because the service keeps the existing
   * value when none is sent, but it is the field that makes the record worth
   * anything afterwards.
   */
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  /**
   * SKIPPED, REFUSED or HELD — a dose not given for different reasons is a
   * different clinical fact.
   */
  @IsEnum(MARStatus)
  @IsOptional()
  status?: MARStatus;
}
