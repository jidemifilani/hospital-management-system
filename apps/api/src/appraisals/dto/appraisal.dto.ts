import { AppraisalPeriod, AppraisalStatus } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/** Staff appraisals: the period reviewed and what was said about it. */
export class CreateAppraisalDto {
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  reviewedById: string;

  @IsEnum(AppraisalPeriod)
  period: AppraisalPeriod;

  /**
   * Bounded rather than any integer: a typo of 202 or 20255 would file the
   * review against a year that cannot be found again.
   */
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  /** Only meaningful for a QUARTERLY period. */
  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  quarter?: number;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  goals?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  staffComments?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  reviewerComments?: string;
}

/**
 * The review itself: the four scores and the written assessment.
 *
 * The scores nearly went missing from here. The service reads them through a
 * computed key — `data[s]` for each of the four names — rather than naming each
 * field, so a search for what the service consumes did not see them at all.
 * Left out, the pipe would have rejected the whole "Save Scores" request as
 * containing unexpected properties, and no test covers this screen.
 *
 * One to five in halves, matching the inputs the reviewer is given. The service
 * averages whichever are supplied into the overall score.
 */
export class UpdateAppraisalDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  attendanceScore?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  performanceScore?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  teamworkScore?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  initiativeScore?: number;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  strengths?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  improvements?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  goals?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  staffComments?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  reviewerComments?: string;
}

export class UpdateAppraisalStatusDto {
  @IsEnum(AppraisalStatus)
  status: AppraisalStatus;
}
