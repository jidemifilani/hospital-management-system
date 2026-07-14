import { IsEmail, IsEnum, IsString, MinLength, IsOptional } from "class-validator";
import { StaffRole } from "@prisma/client";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(StaffRole)
  role: StaffRole;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;
}
