import { WardRoundStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

/**
 * A ward round: the doctor's visit to a patient and what came of it.
 *
 * The three bodies here were typed `any`, so nothing checked them and a round
 * raised without a patient came back as a 500. The clinical text fields are
 * generously sized but bounded — a note is prose, not an upload.
 */
export class CreateWardRoundDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsOptional()
  bedId?: string;

  @IsString()
  @IsOptional()
  nurseId?: string;

  @IsDateString()
  @IsOptional()
  roundDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  findings?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  assessment?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  plan?: string;

  /**
   * When the patient should be seen again. This is the field patient recall
   * reads to chase people who were told to come back, so a malformed date here
   * used to mean a follow-up that silently never happened.
   */
  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateWardRoundDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  findings?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  assessment?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  plan?: string;

  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;

  @IsEnum(WardRoundStatus)
  @IsOptional()
  status?: WardRoundStatus;
}

/** Closing the round off: the findings as they finally stood. */
export class CompleteWardRoundDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  findings?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  assessment?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  plan?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}
