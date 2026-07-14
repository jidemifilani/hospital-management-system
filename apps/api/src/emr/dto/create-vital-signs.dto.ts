import { IsString, IsOptional, IsNumber, IsInt, Min, Max } from "class-validator";

export class CreateVitalSignsDto {
  @IsString() patientId: string;
  @IsString() @IsOptional() appointmentId?: string;
  @IsNumber() @IsOptional() temperature?: number;
  @IsInt() @IsOptional() systolicBP?: number;
  @IsInt() @IsOptional() diastolicBP?: number;
  @IsInt() @IsOptional() heartRate?: number;
  @IsInt() @IsOptional() respiratoryRate?: number;
  @IsNumber() @IsOptional() oxygenSaturation?: number;
  @IsNumber() @IsOptional() weight?: number;
  @IsNumber() @IsOptional() height?: number;
  @IsNumber() @IsOptional() bloodGlucose?: number;
  @IsInt() @Min(0) @Max(10) @IsOptional() pain?: number;
  @IsString() @IsOptional() notes?: string;
}
