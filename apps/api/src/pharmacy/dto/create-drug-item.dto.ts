import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateDrugItemDto {
  @IsString() name: string;
  @IsOptional() @IsString() genericName?: string;
  @IsString() code: string;
  @IsString() category: string;
  @IsString() unit: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) reorderLevel?: number;
  @IsNumber() @Min(0) @Type(() => Number) sellingPrice: number;
}
