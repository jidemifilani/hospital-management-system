import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class PrescriptionItemDto {
  @IsString() drugItemId: string;
  @IsString() dosage: string;
  @IsString() frequency: string;
  @IsString() duration: string;
  @IsInt() @Min(1) quantity: number;
  @IsString() @IsOptional() instructions?: string;
}

export class CreatePrescriptionDto {
  @IsString() patientId: string;
  @IsString() @IsOptional() appointmentId?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
  @IsString() @IsOptional() notes?: string;
}
