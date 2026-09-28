import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { EncounterType, EncounterStatus } from "@prisma/client";

export class CreateEncounterDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsEnum(EncounterType)
  @IsOptional()
  type?: EncounterType;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;

  @IsString()
  @IsOptional()
  attendingDoctorId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  chiefComplaint?: string;

  @IsBoolean()
  @IsOptional()
  isBillable?: boolean;
}

export class UpdateEncounterDto {
  @IsString()
  @IsOptional()
  attendingDoctorId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  disposition?: string;
}

export class UpdateEncounterStatusDto {
  @IsEnum(EncounterStatus)
  status: EncounterStatus;
}

export class CloseEncounterDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  disposition?: string;

  @IsBoolean()
  @IsOptional()
  autoInvoice?: boolean;
}
