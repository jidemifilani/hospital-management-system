import { AlertSeverity, AlertType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * The body was typed `any`, which means the global validation pipe had nothing
 * to check it against and let anything through. A request missing patientId or
 * title reached Prisma and came back as 500 "Internal server error" — true,
 * unhelpful, and indistinguishable from the server being broken.
 *
 * The enums are validated against Prisma's own, so a severity of "VERY_BAD"
 * is refused here by name rather than failing later as a database error.
 */
export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsEnum(AlertType)
  type: AlertType;

  /** Defaults to MODERATE in the service when absent. */
  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}

export class ResolveAlertDto {
  /**
   * Optional, because an alert can simply stop applying. Where a reason is
   * given it is kept on the record.
   */
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
