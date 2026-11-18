import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

/**
 * The vocabulary of a report.
 *
 * These lists are the only functions, buckets and operators that exist. A
 * request naming anything else is refused by the pipe before the service sees
 * it, which matters more than usual here: the service turns these into SQL.
 */
export const MEASURE_FUNCTIONS = ["count", "sum", "avg", "min", "max"] as const;
export const DATE_BUCKETS = ["day", "week", "month", "quarter", "year"] as const;
export const FILTER_OPERATORS = [
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "contains",
  "between",
  "isNull",
  "notNull",
] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type MeasureFunction = (typeof MEASURE_FUNCTIONS)[number];
export type DateBucket = (typeof DATE_BUCKETS)[number];
export type FilterOperator = (typeof FILTER_OPERATORS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** A column to group by. `bucket` applies to dates only. */
export class ReportDimensionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  field: string;

  @IsIn(DATE_BUCKETS)
  @OptionalWhenBlank()
  bucket?: DateBucket;
}

/** A column to aggregate. `count` is the only one that needs no field. */
export class ReportMeasureDto {
  @IsIn(MEASURE_FUNCTIONS)
  fn: MeasureFunction;

  @IsString()
  @OptionalWhenBlank()
  @MaxLength(60)
  field?: string;

  @IsString()
  @OptionalWhenBlank()
  @MaxLength(60)
  label?: string;
}

/**
 * One condition.
 *
 * Values arrive as text and are converted against the field's declared kind,
 * so a date filter cannot carry a number and an enum filter cannot carry a
 * value the column does not have.
 */
export class ReportFilterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  field: string;

  @IsIn(FILTER_OPERATORS)
  op: FilterOperator;

  @IsString()
  @OptionalWhenBlank()
  @MaxLength(200)
  value?: string;

  /** The upper bound of `between`. */
  @IsString()
  @OptionalWhenBlank()
  @MaxLength(200)
  value2?: string;

  /** The set for `in`. */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  values?: string[];
}

export class ReportSortDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  key: string;

  @IsIn(SORT_DIRECTIONS)
  direction: SortDirection;
}

/** A query. Saved reports hold exactly this, plus a name. */
export class RunReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  source: string;

  // Four dimensions is already a table nobody can read; the cap is there so a
  // request cannot ask for a grouping the database has to sort the world for.
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => ReportDimensionDto)
  @IsOptional()
  dimensions?: ReportDimensionDto[];

  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ReportMeasureDto)
  @IsOptional()
  measures?: ReportMeasureDto[];

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  @IsOptional()
  filters?: ReportFilterDto[];

  @ValidateNested()
  @Type(() => ReportSortDto)
  @IsOptional()
  sort?: ReportSortDto;

  @IsInt()
  @Min(1)
  @Max(5000)
  @IsOptional()
  limit?: number;
}

export class SaveReportDto extends RunReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @OptionalWhenBlank()
  @MaxLength(500)
  description?: string;
}

export class UpdateReportDto extends PartialType(SaveReportDto) {}
