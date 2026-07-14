import { IsEnum, IsString, IsOptional } from "class-validator";

export class ReviewLeaveDto {
  @IsEnum(["APPROVED", "REJECTED"])
  decision: "APPROVED" | "REJECTED";

  @IsString()
  @IsOptional()
  rejectionNote?: string;
}
