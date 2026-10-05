import { AssetCategory, MaintenanceType } from "@prisma/client";
import { PartialType } from "@nestjs/mapped-types";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

/** Equipment and property, and the maintenance each piece is due. */
export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsEnum(AssetCategory)
  category: AssetCategory;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  model?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  serialNumber?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  /** Money, so a number and never negative. */
  @IsNumber()
  @Min(0)
  @IsOptional()
  purchasePrice?: number;

  @IsDateString()
  @IsOptional()
  warrantyExpiry?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

/** Every field optional, inheriting the rules above. */
export class UpdateAssetDto extends PartialType(CreateAssetDto) {}

export class ScheduleMaintenanceDto {
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsDateString()
  scheduledDate: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  performedBy?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class CompleteMaintenanceDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  performedBy?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
