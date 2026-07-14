import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class LabResultItemDto {
  @IsString() testName: string;
  @IsString() @IsOptional() testCode?: string;
  @IsString() result: string;
  @IsString() @IsOptional() unit?: string;
  @IsString() @IsOptional() normalRange?: string;
  @IsBoolean() @IsOptional() isAbnormal?: boolean;
  @IsBoolean() @IsOptional() isCritical?: boolean;
  @IsString() @IsOptional() notes?: string;
}

export class AddLabResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultItemDto)
  results: LabResultItemDto[];
}
