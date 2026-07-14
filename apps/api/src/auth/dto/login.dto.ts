import { IsEmail, IsOptional, IsString, Length, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "admin@hostital.ng" })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: "6-digit TOTP code (required when MFA is enabled)" })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totpCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class EnableMfaDto {
  @ApiProperty({ description: "6-digit TOTP code to verify MFA setup" })
  @IsString()
  @Length(6, 6)
  code: string;
}
