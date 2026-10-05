import { AppraisalPeriod, AppraisalStatus } from "@prisma/client";
import {
  IsEnum,
  IsInt,
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

export class UpdateAppraisalDto {
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
