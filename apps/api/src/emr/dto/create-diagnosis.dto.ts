import { IsString, IsOptional, IsEnum } from "class-validator";
import { DiagnosisType, DiagnosisStatus } from "@prisma/client";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

export class CreateDiagnosisDto {
  @IsString() patientId: string;
  @IsString() @IsOptional() appointmentId?: string;
  @IsString() @IsOptional() icdCode?: string;
  @IsString() description: string;
  @IsEnum(DiagnosisType) @OptionalWhenBlank() diagnosisType?: DiagnosisType;
  @IsEnum(DiagnosisStatus) @OptionalWhenBlank() status?: DiagnosisStatus;
  @IsString() @IsOptional() notes?: string;
}
