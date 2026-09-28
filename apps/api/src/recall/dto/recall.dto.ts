import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { OutreachChannel, OutreachOutcome, RecallSource } from "@prisma/client";

export class RaiseRecallDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  /** Without this nobody knows what they are ringing about. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason: string;

  @IsDateString()
  dueOn: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  instructions?: string;

  @IsEnum(RecallSource)
  @IsOptional()
  source?: RecallSource;

  @IsString()
  @IsOptional()
  assignedToId?: string;
}

export class LogAttemptDto {
  @IsEnum(OutreachChannel)
  channel: OutreachChannel;

  @IsEnum(OutreachOutcome)
  outcome: OutreachOutcome;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}

export class BookRecallDto {
  @IsString()
  @IsNotEmpty()
  appointmentId: string;
}

export class CancelRecallDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
