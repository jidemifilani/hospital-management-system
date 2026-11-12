import {
  IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, IsArray, IsEmail,
  ValidateNested, ArrayMinSize, Min, MaxLength, IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

export class RfqItemDto {
  @IsString() @IsNotEmpty() @MaxLength(200) itemName: string;
  @IsString() @IsOptional() @MaxLength(100) category?: string;
  @IsString() @IsOptional() @MaxLength(40) unit?: string;
  @IsInt() @Min(1) quantity: number;
  @IsString() @IsOptional() specification?: string;
}

export class CreateRfqDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsString() @IsOptional() description?: string;
  @IsDateString() @OptionalWhenBlank() dueDate?: string;
  @IsString() @IsOptional() notes?: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RfqItemDto)
  items: RfqItemDto[];
}

export class UpdateRfqDto {
  @IsString() @IsOptional() @MaxLength(200) title?: string;
  @IsString() @IsOptional() description?: string;
  @IsDateString() @OptionalWhenBlank() dueDate?: string;
  @IsString() @IsOptional() notes?: string;
}

export class InviteVendorDto {
  @IsString() @IsNotEmpty() @MaxLength(200) vendorName: string;
  @IsString() @IsOptional() @MaxLength(100) vendorContact?: string;
  @IsEmail() @OptionalWhenBlank() vendorEmail?: string;
}

export class QuoteLineDto {
  @IsString() @IsNotEmpty() rfqItemId: string;
  @IsNumber() @Min(0) unitPrice: number;
  @IsInt() @Min(1) @IsOptional() quantity?: number;
  @IsString() @IsOptional() notes?: string;
}

export class SubmitQuoteDto {
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines: QuoteLineDto[];

  @IsInt() @Min(0) @IsOptional() leadTimeDays?: number;
  @IsDateString() @OptionalWhenBlank() validUntil?: string;
  @IsString() @IsOptional() notes?: string;
}

export class AwardRfqDto {
  @IsString() @IsNotEmpty() quoteId: string;
}
