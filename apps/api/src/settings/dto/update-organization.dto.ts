import { IsString, IsOptional, IsEmail, IsUrl } from "class-validator";
import { OptionalWhenBlank } from "../../common/validation/optional-when-blank.decorator";

// Without decorators the global whitelist pipe rejects every property.
export class UpdateOrganizationDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() phone?: string;
  @IsEmail() @OptionalWhenBlank() email?: string;
  @IsUrl() @OptionalWhenBlank() website?: string;
  @IsString() @IsOptional() logoUrl?: string;
}
