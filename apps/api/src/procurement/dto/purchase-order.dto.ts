import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

/** A line on a purchase order. */
export class PurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  itemName: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  unit?: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

/**
 * A purchase order.
 *
 * `items` is required and must not be empty. The service totals the order with
 * `data.items.reduce(...)` before anything else, so an order sent without them
 * failed on "Cannot read properties of undefined" and surfaced as a 500 — and
 * an order with an empty array was accepted as a purchase order for nothing,
 * worth zero.
 *
 * Each line is validated in full, because quantity and unitPrice are
 * multiplied into that total: a string price made the total `NaN`, which
 * stored silently.
 */
export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  vendorName: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  vendorContact?: string;

  @IsEmail()
  @IsOptional()
  vendorEmail?: string;

  @IsDateString()
  @IsOptional()
  expectedAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
