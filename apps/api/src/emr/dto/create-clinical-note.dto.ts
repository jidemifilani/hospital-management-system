import { IsString, IsOptional, IsEnum } from "class-validator";
import { ClinicalNoteType } from "@prisma/client";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

export class CreateClinicalNoteDto {
  @IsString() patientId: string;
  @IsString() @IsOptional() appointmentId?: string;
  @IsEnum(ClinicalNoteType) @IsOptional() noteType?: ClinicalNoteType;
  @IsString() @IsOptional() subjective?: string;
  @IsString() @IsOptional() objective?: string;
  @IsString() @IsOptional() assessment?: string;
  @IsString() @IsOptional() plan?: string;
  @IsString() @IsOptional() content?: string;
  @IsStrictBoolean() @IsOptional() isDraft?: boolean;
}
