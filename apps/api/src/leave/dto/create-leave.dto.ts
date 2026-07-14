import { IsEnum, IsDateString, IsString, IsNotEmpty, MinLength } from "class-validator";
import { LeaveType } from "@prisma/client";

export class CreateLeaveDto {
  @IsEnum(LeaveType)
  type: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}
