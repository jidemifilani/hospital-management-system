import { IsString, IsOptional, IsEnum, MaxLength, IsNotEmpty } from "class-validator";
import { DocumentCategory, DocumentConfidentiality } from "@prisma/client";

/**
 * Multipart fields arrive as strings, so these carry no numeric or boolean
 * members — anything of that shape would need an explicit transform.
 */
export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @IsEnum(DocumentConfidentiality)
  @IsOptional()
  confidentiality?: DocumentConfidentiality;

  @IsString()
  @IsOptional()
  patientId?: string;

  @IsString()
  @IsOptional()
  encounterId?: string;

  @IsString()
  @IsOptional()
  admissionId?: string;

  @IsString()
  @IsOptional()
  claimId?: string;

  /** Set when this upload replaces an earlier version. */
  @IsString()
  @IsOptional()
  supersedesId?: string;
}

export class RemoveDocumentDto {
  /** Required: a removed clinical record has to say why it was removed. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
