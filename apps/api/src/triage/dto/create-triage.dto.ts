import { IsString, IsOptional, IsEnum, IsInt, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { TriageLevel } from "@prisma/client";

/**
 * The endpoint previously took `any`, so a mistyped triage level surfaced to
 * the nurse as a 500 rather than a message naming the valid options.
 */
export class CreateTriageDto {
  @IsString() @IsOptional() patientId?: string;
  @IsString() @IsOptional() walkinName?: string;
  @IsString() @IsOptional() walkinPhone?: string;

  @IsString() chiefComplaint: string;
  @IsEnum(TriageLevel) triageLevel: TriageLevel;

  @IsInt() @Min(0) @Max(300) @Type(() => Number) @IsOptional() systolicBP?: number;
  @IsInt() @Min(0) @Max(200) @Type(() => Number) @IsOptional() diastolicBP?: number;
  @IsInt() @Min(0) @Max(300) @Type(() => Number) @IsOptional() heartRate?: number;
  @IsNumber() @Min(20) @Max(45) @Type(() => Number) @IsOptional() temperature?: number;
  @IsInt() @Min(0) @Max(100) @Type(() => Number) @IsOptional() oxygenSaturation?: number;
  @IsInt() @Min(0) @Max(100) @Type(() => Number) @IsOptional() respiratoryRate?: number;
  @IsInt() @Min(0) @Max(10) @Type(() => Number) @IsOptional() painScore?: number;
  @IsInt() @Min(3) @Max(15) @Type(() => Number) @IsOptional() glasgowComaScale?: number;

  @IsString() @IsOptional() notes?: string;
}
