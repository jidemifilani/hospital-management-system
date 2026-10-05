import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { EncounterType, EncounterStatus } from "@prisma/client";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

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

  @IsStrictBoolean()
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

  @IsStrictBoolean()
  @IsOptional()
  autoInvoice?: boolean;
}
