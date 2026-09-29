import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  Matches,
  MaxLength,
  IsNotEmpty,
} from "class-validator";

/**
 * Was an interface, which erases at runtime — so the global pipe saw no
 * metadata, skipped validation entirely, and the body was spread straight into
 * Prisma. An unknown field reached the database layer and came back as a 500
 * rather than a 400 naming it.
 */
export class CreateRosterDto {
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsDateString()
  date: string;

  @IsEnum(["MORNING", "AFTERNOON", "NIGHT", "ON_CALL"])
  shiftType: "MORNING" | "AFTERNOON" | "NIGHT" | "ON_CALL";

  /** 24-hour clock; a shift that cannot be parsed cannot be rostered. */
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "startTime must be HH:mm" })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "endTime must be HH:mm" })
  endTime: string;

  @IsBoolean()
  @IsOptional()
  isOnCall?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
