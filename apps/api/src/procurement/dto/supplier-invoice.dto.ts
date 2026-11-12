import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

/**
 * One billed line.
 *
 * `poItemId` is optional because a supplier can bill for something that was
 * never ordered — which is precisely the discrepancy the three-way match
 * exists to surface, so it has to be accepted and then flagged, not rejected
 * at the door.
 */
export class SupplierInvoiceLineDto {
  @IsString()
  @OptionalWhenBlank()
  poItemId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

/**
 * A supplier's invoice against a purchase order.
 *
 * The total is `quantity * unitPrice` summed over the lines and stored as a
 * Decimal, so an unvalidated body put `NaN` into the amount the hospital owes.
 * It was typed `any` until now, which left the global pipe nothing to check.
 */
export class CreateSupplierInvoiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  vendorInvoiceNo?: string;

  @IsDateString()
  invoiceDate: string;

  @IsDateString()
  @OptionalWhenBlank()
  dueDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplierInvoiceLineDto)
  lines: SupplierInvoiceLineDto[];
}
