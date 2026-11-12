import { IsString, IsOptional, IsEnum, IsArray, ArrayMinSize, IsNotEmpty } from "class-validator";
import { LabOrderPriority } from "@prisma/client";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

export class CreateLabOrderDto {
  @IsString() patientId: string;
  @IsString() @IsOptional() appointmentId?: string;
  @IsString() @IsOptional() encounterId?: string;
  @IsEnum(LabOrderPriority) @OptionalWhenBlank() priority?: LabOrderPriority;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) @IsNotEmpty({ each: true }) tests: string[];
  @IsString() @IsOptional() clinicalInfo?: string;
  @IsString() @IsOptional() sampleType?: string;
}
