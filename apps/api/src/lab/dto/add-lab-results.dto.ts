import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

export class LabResultItemDto {
  @IsString() testName: string;
  @IsString() @IsOptional() testCode?: string;
  @IsString() result: string;
  @IsString() @IsOptional() unit?: string;
  @IsString() @IsOptional() normalRange?: string;
  @IsStrictBoolean() @IsOptional() isAbnormal?: boolean;
  @IsStrictBoolean() @IsOptional() isCritical?: boolean;
  @IsString() @IsOptional() notes?: string;
}

export class AddLabResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultItemDto)
  results: LabResultItemDto[];
}
