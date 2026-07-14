import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class InvoiceItemDto {
  @IsString() description: string;
  @IsString() category: string;
  @IsInt() @Min(1) quantity: number;
  @IsNumber() @IsPositive() unitPrice: number;
}

export class CreateInvoiceDto {
  @IsString() patientId: string;
  @IsString() @IsOptional() appointmentId?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
  @IsNumber() @Min(0) @IsOptional() discount?: number;
  @IsNumber() @Min(0) @IsOptional() tax?: number;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() dueDate?: string;
}
