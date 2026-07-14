import { IsString, IsOptional } from "class-validator";

export class AddRadiologyResultDto {
  @IsString() findings: string;
  @IsString() impression: string;
  @IsOptional() @IsString() recommendations?: string;
  @IsOptional() @IsString() imageUrl?: string;
}
