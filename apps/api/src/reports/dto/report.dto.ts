import { IsString, IsNotEmpty, IsEnum, IsArray, IsEmail, IsOptional, IsBoolean, MaxLength } from "class-validator";

const REPORT_TYPES = ["BILLING_SUMMARY","INVENTORY_VALUATION","LOW_STOCK","PAYROLL_SUMMARY","PROCUREMENT_SUMMARY","PATIENT_ADMISSIONS"] as const;
const FREQUENCIES  = ["DAILY","WEEKLY","MONTHLY"] as const;

export class CreateScheduledReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEnum(REPORT_TYPES)
  type: string;

  @IsEnum(FREQUENCIES)
  frequency: string;

  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];
}

export class UpdateScheduledReportDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsEnum(REPORT_TYPES)
  @IsOptional()
  type?: string;

  @IsEnum(FREQUENCIES)
  @IsOptional()
  frequency?: string;

  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  recipients?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
