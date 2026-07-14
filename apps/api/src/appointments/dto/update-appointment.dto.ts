import { IsEnum, IsOptional, IsString } from "class-validator";
import { AppointmentStatus } from "@prisma/client";

export class UpdateAppointmentDto {
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  cancelReason?: string;
}
