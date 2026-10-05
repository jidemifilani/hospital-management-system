import { IsString, IsDateString, IsEnum, IsOptional, IsInt, Min } from "class-validator";
import { AppointmentType } from "@prisma/client";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

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

  @IsStrictBoolean()
  @IsOptional()
  isTelemedicine?: boolean;
}
