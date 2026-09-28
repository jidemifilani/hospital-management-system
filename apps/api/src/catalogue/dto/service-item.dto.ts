import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { ServiceCategory } from "@prisma/client";

export class CreateServiceItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  // Scheme prices are optional, and the form sends null rather than omitting
  // them when left blank; absent or null means the standard price applies.
  @IsNumber()
  @Min(0)
  @IsOptional()
  nhisPrice?: number | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hmoPrice?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(24)
  unit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class UpdateServiceItemDto {
  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string;

  @IsEnum(ServiceCategory)
  @IsOptional()
  category?: ServiceCategory;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  // null is meaningful here: it clears a scheme price rather than leaving it
  // unchanged, so these cannot simply be `@IsNumber()`.
  @IsNumber()
  @Min(0)
  @IsOptional()
  nhisPrice?: number | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hmoPrice?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(24)
  unit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
