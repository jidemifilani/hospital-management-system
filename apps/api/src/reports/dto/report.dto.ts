import { IsString, IsNotEmpty, IsEnum, IsArray, IsEmail, IsOptional, IsBoolean, MaxLength } from "class-validator";
import { ScheduledReportType, ScheduledReportFrequency } from "@prisma/client";

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
  @IsOptional()
  type?: ScheduledReportType;

  @IsEnum(ScheduledReportFrequency)
  @IsOptional()
  frequency?: ScheduledReportFrequency;

  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  recipients?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
