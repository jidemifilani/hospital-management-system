import { RehabStatus, TherapyType } from "@prisma/client";
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

/** Therapy sessions: who is being seen, by whom, for what. */
export class CreateRehabSessionDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  therapistId: string;

  @IsEnum(TherapyType)
  type: TherapyType;

  @IsDateString()
  scheduledAt: string;

  @IsString()
  @IsOptional()
  @MaxLength(3000)
  goals?: string;
}

export class CompleteRehabSessionDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  sessionNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  progressNotes?: string;

  /**
   * A score, so it is bounded and numeric. Off an untyped body a string went
   * to a Decimal column and failed as a 500 rather than as "this is not a
   * number".
   */
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  functionalScore?: number;
}

/**
 * Moving a session along.
 *
 * `status` is required. Read off an untyped body it was cast straight into the
 * update, where Prisma treats `undefined` as "leave this column alone" — so a
 * request that omitted it changed nothing and still answered 200.
 */
export class UpdateRehabStatusDto {
  @IsEnum(RehabStatus)
  status: RehabStatus;
}
