import { IsEnum, IsOptional, IsString } from "class-validator";
import { AppointmentStatus } from "@prisma/client";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

export class UpdateAppointmentDto {
  @IsEnum(AppointmentStatus)
  @OptionalWhenBlank()
  status?: AppointmentStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  cancelReason?: string;
}
