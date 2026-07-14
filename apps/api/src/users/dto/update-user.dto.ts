import { IsEnum, IsString, IsOptional } from "class-validator";
import { UserStatus, StaffRole } from "@prisma/client";

export class UpdateUserDto {
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsEnum(StaffRole)
  @IsOptional()
  role?: StaffRole;

  @IsString()
  @IsOptional()
  departmentId?: string;
}
