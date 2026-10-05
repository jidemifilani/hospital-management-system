import { CarePlanTaskStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

/** A nursing care plan and the tasks it breaks down into. */
export class CreateCarePlanDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  goals?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  /**
   * Tasks may be sent with the plan, and each one is validated in full rather
   * than the array merely being an array — otherwise a task with no
   * description reaches the nested write and fails there, as the whole plan.
   *
   * `@Type` is what makes that work: without it the entries stay plain objects
   * and the nested rules never run.
   */
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddCarePlanTaskDto)
  tasks?: AddCarePlanTaskDto[];

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}

export class AddCarePlanTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  /** Free text, e.g. "twice daily" — the schema keeps it as prose. */
  @IsString()
  @IsOptional()
  @MaxLength(120)
  frequency?: string;

  @IsDateString()
  @IsOptional()
  dueAt?: string;
}

export class UpdateCarePlanTaskDto {
  @IsEnum(CarePlanTaskStatus)
  status: CarePlanTaskStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
