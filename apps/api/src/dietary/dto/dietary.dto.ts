import { MealType } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

/** Diet orders and what the patient was actually served and ate. */
export class CreateDietOrderDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  /** Free text in the schema: diets are described, not enumerated. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  dietType: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  /**
   * Dietary allergies, separate from the clinical allergy list. Encrypted on
   * the patient record; here it is the kitchen's copy of the instruction.
   */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  allergies?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  instructions?: string;
}

export class RecordMealDto {
  @IsString()
  @IsNotEmpty()
  dietOrderId: string;

  @IsEnum(MealType)
  mealType: MealType;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsStrictBoolean()
  @IsOptional()
  served?: boolean;

  /**
   * Whether the patient ate it. Booleans off an untyped body arrived as the
   * strings "true" and "false", which are both truthy — so a meal recorded as
   * not eaten was stored as eaten.
   */
  @IsStrictBoolean()
  @IsOptional()
  consumed?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
