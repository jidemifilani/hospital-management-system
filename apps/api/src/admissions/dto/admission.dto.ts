import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { AdmissionType, AdmissionStatus, DischargeType } from "@prisma/client";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

export class AdmitPatientDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  bedId: string;

  @IsString()
  @IsNotEmpty()
  admittingDoctorId: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  encounterId?: string;

  @IsString()
  @IsOptional()
  attendingDoctorId?: string;

  @IsEnum(AdmissionType)
  @IsOptional()
  admissionType?: AdmissionType;

  /** An admission without a stated reason cannot be clinically reviewed. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  provisionalDiagnosis?: string;

  @IsDateString()
  @IsOptional()
  expectedDischargeAt?: string;
}

export class TransferBedDto {
  @IsString()
  @IsNotEmpty()
  targetBedId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class DischargeDto {
  @IsEnum(DischargeType)
  @IsOptional()
  dischargeType?: DischargeType;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  dischargeNotes?: string;

  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  followUpInstructions?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  medicationsOnDischarge?: string;

  @IsEnum(AdmissionStatus)
  @IsOptional()
  status?: AdmissionStatus;

  @IsStrictBoolean()
  @IsOptional()
  autoInvoice?: boolean;
}
