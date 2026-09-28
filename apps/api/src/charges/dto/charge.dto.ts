import { IsString, IsOptional, IsNumber, IsInt, Min, MaxLength, IsNotEmpty } from "class-validator";

export class PostManualChargeDto {
  @IsString()
  @IsNotEmpty()
  encounterId: string;

  /** The item is named by id or by catalogue code; the service resolves it. */
  @IsString()
  @IsOptional()
  serviceItemId?: string;

  @IsString()
  @IsOptional()
  serviceItemCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;
}

export class VoidChargeDto {
  /** A voided charge has to carry its reason for the audit trail. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  reason: string;
}
