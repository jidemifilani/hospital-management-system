import { PartialType } from "@nestjs/mapped-types";
import { IsString, IsOptional, MaxLength, IsNotEmpty } from "class-validator";

/**
 * These decorators are what make the endpoint work at all.
 *
 * The class existed with none of them, and the global pipe runs with
 * `whitelist` and `forbidNonWhitelisted`: a class with no decorated properties
 * whitelists nothing, so every field sent was stripped and then rejected as
 * unexpected. Creating a department answered 400 "property name should not
 * exist" for a perfectly ordinary request, and had done since validation was
 * switched on.
 */
export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

/** Inherits the rules above with every field optional. */
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
