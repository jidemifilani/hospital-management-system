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

/** One received line: how much of a purchase order item actually arrived. */
export class GoodsReceiptLineDto {
  @IsString()
  @IsNotEmpty()
  poItemId: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

/**
 * A goods receipt note: what the hospital says it received.
 *
 * It is one of the three documents the match reconciles, and until now it was
 * typed `any`, so nothing checked it. Each line's quantity is added to the
 * purchase order item's `receivedQuantity` and its unit cost is carried into
 * the match, so a quantity sent as text made the running total `NaN` and a
 * missing `poItemId` wrote a receipt against nothing.
 *
 * `lines` must hold at least one. The form already drops the lines received
 * as zero, so an empty array means nothing arrived — a receipt for no goods,
 * which would still count as a delivery against the order.
 */
export class CreateGoodsReceiptDto {
  @IsDateString()
  @OptionalWhenBlank()
  receivedAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  lines: GoodsReceiptLineDto[];
}
