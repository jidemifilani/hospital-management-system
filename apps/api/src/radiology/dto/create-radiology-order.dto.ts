import { IsString, IsEnum, IsOptional, IsDateString } from "class-validator";

export enum ImagingModality {
  XRAY = "XRAY", CT_SCAN = "CT_SCAN", MRI = "MRI", ULTRASOUND = "ULTRASOUND",
  MAMMOGRAPHY = "MAMMOGRAPHY", FLUOROSCOPY = "FLUOROSCOPY",
  NUCLEAR_MEDICINE = "NUCLEAR_MEDICINE", PET_SCAN = "PET_SCAN", ECHOCARDIOGRAPHY = "ECHOCARDIOGRAPHY",
}

export enum OrderPriority {
  ROUTINE = "ROUTINE", URGENT = "URGENT", STAT = "STAT",
}

export class CreateRadiologyOrderDto {
  @IsString() patientId: string;
  @IsOptional() @IsString() appointmentId?: string;
  @IsOptional() @IsString() encounterId?: string;
  @IsOptional() @IsString() serviceItemId?: string;
  @IsEnum(ImagingModality) modality: ImagingModality;
  @IsString() bodyPart: string;
  @IsOptional() @IsEnum(OrderPriority) priority?: OrderPriority;
  @IsOptional() @IsString() clinicalInfo?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
}
