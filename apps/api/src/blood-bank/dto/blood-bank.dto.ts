import { BloodGroup, BloodRequestUrgency } from "@prisma/client";
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/**
 * The blood bank. Of everything in this pass, the blood group is the field
 * most worth refusing early: typed `any` it was carried through as whatever
 * was sent, and a group that is not one of the eight is a unit nobody can
 * safely match.
 */
export class AddBloodDonorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEnum(BloodGroup)
  bloodGroup: BloodGroup;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;
}

export class AddBloodUnitDto {
  @IsEnum(BloodGroup)
  bloodGroup: BloodGroup;

  @IsString()
  @IsOptional()
  donorId?: string;

  /** Millilitres. A standard unit is around 450ml. */
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  volume?: number;

  /**
   * Both dates are required, because the service calls `new Date()` on each of
   * them unconditionally. Absent, that produced an Invalid Date rather than a
   * refusal — and for the expiry that is a unit the expiry sweep can never
   * flag as out of date, sitting in the fridge looking usable.
   */
  @IsDateString()
  collectedAt: string;

  @IsDateString()
  expiresAt: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class CreateBloodRequestDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsEnum(BloodGroup)
  bloodGroup: BloodGroup;

  /** How many units. At least one, and a ceiling so a typo cannot ask for 100. */
  @IsInt()
  @Min(1)
  @Max(20)
  units: number;

  @IsEnum(BloodRequestUrgency)
  urgency: BloodRequestUrgency;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  clinicalReason: string;
}
