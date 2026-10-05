import { SurgeryUrgency, TheatreBookingStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/** Theatre bookings: the operation, the team, and the room. */
export class CreateTheatreBookingDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  procedureName: string;

  @IsString()
  @IsNotEmpty()
  surgeonId: string;

  @IsString()
  @IsOptional()
  assistantSurgeonId?: string;

  @IsString()
  @IsOptional()
  anaesthesiologistId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  anaesthesiaType?: string;

  @IsEnum(SurgeryUrgency)
  urgency: SurgeryUrgency;

  @IsDateString()
  scheduledDate: string;

  /** Minutes. Bounded so a booking cannot silently occupy a room for weeks. */
  @IsInt()
  @Min(5)
  @Max(1440)
  @IsOptional()
  scheduledDuration?: number;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  operatingRoom?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  icdCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  preOpNotes?: string;
}

export class UpdateTheatreBookingStatusDto {
  @IsEnum(TheatreBookingStatus)
  status: TheatreBookingStatus;

  @IsDateString()
  @IsOptional()
  actualStartTime?: string;

  @IsDateString()
  @IsOptional()
  actualEndTime?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  postOpNotes?: string;

  /**
   * Anything that went wrong. Worth recording precisely, which is a reason for
   * it to be refused when it is not a string rather than coerced into one.
   */
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  complications?: string;
}
