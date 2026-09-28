import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  Min,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { ServiceCategory } from "@prisma/client";

export class PostManualChargeDto {
  @IsString()
  @IsNotEmpty()
  encounterId: string;

  /**
   * Required unless a catalogue item supplies it — the service refuses a
   * charge with no category, and revenue is reported by category, so an
   * uncategorised charge could not be attributed to a revenue account.
   */
  @IsEnum(ServiceCategory)
  @IsOptional()
  category?: ServiceCategory;

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
