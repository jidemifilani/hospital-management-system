import { IsString, IsOptional, IsEmail, IsUrl } from "class-validator";

// Without decorators the global whitelist pipe rejects every property.
export class UpdateOrganizationDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() phone?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsUrl() @IsOptional() website?: string;
  @IsString() @IsOptional() logoUrl?: string;
}
