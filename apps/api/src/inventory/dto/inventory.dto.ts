import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { InventoryCategory, StockLocationType } from "@prisma/client";

/**
 * These bodies were previously declared as inline TypeScript types, which
 * erase at runtime — the global ValidationPipe skipped them entirely, so a
 * malformed payload reached Prisma and surfaced as a 500. Declaring them as
 * classes puts them back under `whitelist` and `forbidNonWhitelisted`.
 */

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsEnum(InventoryCategory)
  @IsOptional()
  category?: InventoryCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  unit: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  reorderLevel?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  averageCost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  sellingPrice?: number;
}

export class CreateStockLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEnum(StockLocationType)
  @IsOptional()
  type?: StockLocationType;

  @IsString()
  @IsOptional()
  departmentId?: string;
}

export class ReceiveStockDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsString()
  @IsOptional()
  reference?: string;

  /** Required for batch-tracked items; the service enforces that. */
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  supplierName?: string;
}

export class IssueStockDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsEnum(["ISSUE", "CONSUMPTION", "WRITE_OFF"])
  @IsOptional()
  type?: "ISSUE" | "CONSUMPTION" | "WRITE_OFF";

  @IsString()
  @IsOptional()
  reason?: string;
}

export class TransferStockDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  fromLocationId: string;

  @IsString()
  @IsNotEmpty()
  toLocationId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class StockCountDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  /** Zero is legitimate — a shelf can genuinely be empty. */
  @IsInt()
  @Min(0)
  countedQuantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  reason: string;
}

export class ValuationCorrectionDto {
  @IsString()
  @IsOptional()
  @MaxLength(240)
  reason?: string;
}
