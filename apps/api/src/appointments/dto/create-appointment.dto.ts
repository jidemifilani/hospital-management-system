import { IsString, IsDateString, IsEnum, IsOptional, IsBoolean, IsInt, Min } from "class-validator";
import { AppointmentType } from "@prisma/client";

export class CreateAppointmentDto {
  @IsString()
  patientId: string;

  @IsString()
  doctorId: string;

  @IsString()
  departmentId: string;

  @IsDateString()
  scheduledAt: string;

  @IsInt()
  @Min(10)
  @IsOptional()
  durationMinutes?: number;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  @IsString()
  @IsOptional()
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isTelemedicine?: boolean;
}
