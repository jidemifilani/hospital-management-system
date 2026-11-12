import { IsEnum, IsString, IsOptional } from "class-validator";
import { UserStatus, StaffRole } from "@prisma/client";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

export class UpdateUserDto {
  @IsEnum(UserStatus)
  @OptionalWhenBlank()
  status?: UserStatus;

  @IsEnum(StaffRole)
  @OptionalWhenBlank()
  role?: StaffRole;

  @IsString()
  @IsOptional()
  departmentId?: string;
}
