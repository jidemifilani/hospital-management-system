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
   * Optional, and defaulted to now by the service. The Add Unit dialog does
   * not collect it — a unit being entered was collected today unless someone
   * says otherwise — so requiring it here would have rejected every request
   * that screen makes.
   */
  @IsDateString()
  @IsOptional()
  collectedAt?: string;

  /**
   * Required, and the form does send it. The service calls `new Date()` on it
   * unconditionally, so absent it produced an Invalid Date rather than a
   * refusal: a unit the expiry sweep can never flag as out of date, sitting in
   * the fridge looking usable.
   */
  @IsDateString()
  expiresAt: string;

  /**
   * Accepted because the Add Unit dialog sends it, and the pipe would
   * otherwise reject the whole request as having an unexpected property.
   *
   * Note that nothing stores it: the service writes `donorId` and has no use
   * for a free-text name. So a donor name typed into that form is discarded,
   * which is a gap in the screen rather than in this DTO.
   */
  @IsString()
  @IsOptional()
  @MaxLength(200)
  donorName?: string;

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
