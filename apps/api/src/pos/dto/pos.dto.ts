import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  Min,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import { PaymentMethod } from "@prisma/client";

export class OpenSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  terminalName: string;

  /** A drawer can legitimately start empty. */
  @IsNumber()
  @Min(0)
  openingFloat: number;
}

export class CloseSessionDto {
  @IsNumber()
  @Min(0)
  closingCounted: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class SaleLineDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  /** Overrides the item's selling price, for an agreed discount on the line. */
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;
}

export class CreateSaleDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  // A sale with no lines is not a sale; nested lines need their own validation
  // or an array of arbitrary objects would pass straight through.
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines: SaleLineDto[];

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @IsString()
  @IsOptional()
  patientId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountTendered?: number;

  @IsString()
  @IsOptional()
  locationId?: string;
}

export class RefundSaleDto {
  /** A refund without a stated reason cannot be reviewed afterwards. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  reason: string;
}
