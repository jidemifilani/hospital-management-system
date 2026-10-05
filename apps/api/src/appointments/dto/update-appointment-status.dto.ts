import { AppointmentStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Changing an appointment's status, including cancelling it.
 *
 * The body was an inline type, which erases at runtime — so the validation
 * pipe saw nothing to validate and the handler checked `if (!body.status)` by
 * hand. That caught an absent status but not a nonsense one, which went
 * through as a Prisma enum error.
 */
export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  /** Expected when cancelling; the service records it against the appointment. */
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  cancelReason?: string;
}
