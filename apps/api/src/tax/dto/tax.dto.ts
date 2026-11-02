import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsBoolean, IsInt, Min, Max, MaxLength } from "class-validator";

const TAX_TYPES = ["OUTPUT_VAT", "INPUT_VAT", "WITHHOLDING", "CUSTOM"] as const;
const REF_TYPES  = ["INVOICE", "SUPPLIER_INVOICE", "PURCHASE_ORDER"] as const;

export class CreateTaxCodeDto {
  @IsString() @IsNotEmpty() @MaxLength(30) code: string;
  @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @IsNumber() @Min(0) @Max(100) rate: number;
  @IsEnum(TAX_TYPES) @IsOptional() type?: string;
}

export class UpdateTaxCodeDto {
  @IsString() @IsOptional() @MaxLength(120) name?: string;
  @IsNumber() @Min(0) @Max(100) @IsOptional() rate?: number;
  @IsEnum(TAX_TYPES) @IsOptional() type?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

export class ApplyTaxDto {
  @IsString() @IsNotEmpty() taxCodeId: string;
  @IsEnum(REF_TYPES) referenceType: string;
  @IsString() @IsNotEmpty() referenceId: string;
  @IsNumber() @Min(0) baseAmount: number;
}

export class CreateTaxReturnDto {
  @IsInt() @Min(2000) @Max(2100) year: number;
  @IsInt() @Min(1) @Max(12) month: number;
  @IsString() @IsOptional() notes?: string;
}

export class UpdateTaxReturnDto {
  @IsEnum(["DRAFT", "SUBMITTED", "PAID"]) @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
}
