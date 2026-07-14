import { IsString, IsOptional, IsEnum } from "class-validator";
import { DiagnosisType, DiagnosisStatus } from "@prisma/client";

export class CreateDiagnosisDto {
  @IsString() patientId: string;
  @IsString() @IsOptional() appointmentId?: string;
  @IsString() @IsOptional() icdCode?: string;
  @IsString() description: string;
  @IsEnum(DiagnosisType) @IsOptional() diagnosisType?: DiagnosisType;
  @IsEnum(DiagnosisStatus) @IsOptional() status?: DiagnosisStatus;
  @IsString() @IsOptional() notes?: string;
}
