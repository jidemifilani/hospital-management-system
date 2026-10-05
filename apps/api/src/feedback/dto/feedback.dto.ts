import { FeedbackCategory, FeedbackStatus } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/**
 * Patient feedback and the hospital's reply.
 *
 * The rating is the field this most needed: it is an Int column, and off an
 * untyped body a rating of "excellent" or 11 was accepted here and either
 * failed at the database or skewed every average quietly. One to five, as an
 * integer.
 */
export class CreateFeedbackDto {
  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  /**
   * Anonymous feedback still records which patient it concerns if given; what
   * changes is whether their name is shown with it.
   */
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsString()
  @IsOptional()
  patientId?: string;
}

export class RespondToFeedbackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  response: string;

  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;
}
