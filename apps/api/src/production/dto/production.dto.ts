import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsDateString,
  Min,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import { BomType } from "@prisma/client";

export class BomLineDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateBomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsEnum(BomType)
  @IsOptional()
  type?: BomType;

  @IsString()
  @IsNotEmpty()
  outputItemId: string;

  /** How many the quantities below produce. */
  @IsInt()
  @Min(1)
  @IsOptional()
  outputQuantity?: number;

  /** Used to work out the produced batch's expiry. */
  @IsInt()
  @Min(1)
  @IsOptional()
  shelfLifeDays?: number;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  instructions?: string;

  // A recipe with no materials produces something from nothing, which would
  // let stock value be created by running it.
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BomLineDto)
  lines: BomLineDto[];
}

export class PlanRunDto {
  @IsString()
  @IsNotEmpty()
  bomId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  locationId: string;
}

export class CompleteRunDto {
  /** Defaults to what was planned; a short yield is recorded as it happened. */
  @IsInt()
  @Min(1)
  @IsOptional()
  quantityProduced?: number;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  batchNumber?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class CancelRunDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
