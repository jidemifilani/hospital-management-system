import { PayComponentType, PayrollStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

/**
 * One line of a payslip: an allowance or a deduction.
 *
 * Validated individually, because the service adds each amount into a Decimal
 * total. An amount that was not a number threw inside that loop and surfaced
 * as a 500, and `isDeduction` arriving as the string "false" is truthy — which
 * turns an allowance into a deduction and quietly understates somebody's pay.
 */
export class PayComponentDto {
  @IsEnum(PayComponentType)
  type: PayComponentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsStrictBoolean()
  isDeduction: boolean;
}

export class CreatePayrollDto {
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  basicSalary?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PayComponentDto)
  components?: PayComponentDto[];

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class UpdatePayrollStatusDto {
  @IsEnum(PayrollStatus)
  status: PayrollStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
