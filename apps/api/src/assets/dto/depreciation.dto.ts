import { IsEnum, IsInt, IsNumber, IsOptional, IsDateString, Min, Max } from "class-validator";
import { DepreciationMethod } from "@prisma/client";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

export class SetupDepreciationDto {
  @IsEnum(DepreciationMethod) depreciationMethod: DepreciationMethod;

  /// Life in months rather than years, so part-year lives are expressible.
  @IsInt() @Min(1) @Max(1200) usefulLifeMonths: number;

  @IsNumber() @Min(0) @IsOptional() salvageValue?: number;

  @IsDateString() @OptionalWhenBlank() depreciationStartDate?: string;
}

export class RunDepreciationDto {
  @IsInt() @Min(2000) @Max(2100) year: number;
  @IsInt() @Min(1) @Max(12) month: number;
}
