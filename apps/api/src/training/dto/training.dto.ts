import { TrainingCategory, TrainingStatus, TrainingType } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/**
 * Staff training records, including the mandatory ones a hospital has to be
 * able to evidence.
 */
export class CreateTrainingRecordDto {
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsEnum(TrainingCategory)
  category: TrainingCategory;

  /** MANDATORY or ELECTIVE — which decides whether an expiry is chased. */
  @IsEnum(TrainingType)
  type: TrainingType;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  provider?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class CompleteTrainingRecordDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  certificationNumber?: string;

  /**
   * When the certificate lapses. A malformed date here used to be accepted and
   * then fail at the column, which for a mandatory course means an expiry that
   * nothing ever chases.
   */
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateTrainingStatusDto {
  @IsEnum(TrainingStatus)
  status: TrainingStatus;
}
