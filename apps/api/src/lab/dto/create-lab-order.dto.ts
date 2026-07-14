import { IsString, IsOptional, IsEnum, IsArray, ArrayMinSize, IsNotEmpty } from "class-validator";
import { LabOrderPriority } from "@prisma/client";

export class CreateLabOrderDto {
  @IsString() patientId: string;
  @IsString() @IsOptional() appointmentId?: string;
  @IsEnum(LabOrderPriority) @IsOptional() priority?: LabOrderPriority;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) @IsNotEmpty({ each: true }) tests: string[];
  @IsString() @IsOptional() clinicalInfo?: string;
  @IsString() @IsOptional() sampleType?: string;
}
