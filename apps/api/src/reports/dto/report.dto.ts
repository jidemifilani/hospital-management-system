import { IsString, IsNotEmpty, IsEnum, IsArray, IsEmail, IsOptional, MaxLength } from "class-validator";
import { ScheduledReportType, ScheduledReportFrequency } from "@prisma/client";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

export class CreateScheduledReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEnum(ScheduledReportType)
  type: ScheduledReportType;

  @IsEnum(ScheduledReportFrequency)
  frequency: ScheduledReportFrequency;

  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];
}

export class UpdateScheduledReportDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsEnum(ScheduledReportType)
  @OptionalWhenBlank()
  type?: ScheduledReportType;

  @IsEnum(ScheduledReportFrequency)
  @OptionalWhenBlank()
  frequency?: ScheduledReportFrequency;

  @IsArray()
  @IsEmail({}, { each: true })
  @OptionalWhenBlank()
  recipients?: string[];

  @IsStrictBoolean()
  @IsOptional()
  isActive?: boolean;
}
