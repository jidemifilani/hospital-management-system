import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

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
  @IsString() @IsOptional() encounterId?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
  @IsString() @IsOptional() notes?: string;
  /** Prescriber has seen the safety warnings and is choosing to proceed. */
  @IsStrictBoolean() @IsOptional() acknowledgeWarnings?: boolean;
}
