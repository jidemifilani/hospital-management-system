import { IsString, IsNumber, IsDateString, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";

export class RestockDrugDto {
  @IsString() batchNumber: string;
  @IsNumber() @Min(1) @Type(() => Number) quantity: number;
  @IsDateString() expiresAt: string;
  @IsOptional() @IsString() supplierName?: string;
  @IsNumber() @Min(0) @Type(() => Number) costPerUnit: number;
}
