import { ShiftType } from "@prisma/client";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

/**
 * The shift handover: what the outgoing staff are passing on.
 *
 * `patients` is a JSON column holding the per-patient notes the UI assembles,
 * so it is validated as an array rather than field by field — the shape is the
 * screen's, not the database's. Everything around it is checked, which is
 * enough to stop a handover being raised with no recipient or no shift.
 */
export class CreateHandoverDto {
  @IsString()
  @IsNotEmpty()
  toStaffId: string;

  @IsEnum(ShiftType)
  shiftType: ShiftType;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsDateString()
  @OptionalWhenBlank()
  handoverDate?: string;

  @IsArray()
  @IsOptional()
  patients?: unknown[];

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  pendingTasks?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  generalNotes?: string;
}
