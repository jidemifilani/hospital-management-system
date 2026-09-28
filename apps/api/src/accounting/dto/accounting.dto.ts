import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsDateString,
  Min,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import { AccountType } from "@prisma/client";

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPostable?: boolean;
}

export class JournalLineDto {
  /** Lines name their account by chart code, not by id. */
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  debit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  credit?: number;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  description?: string;

  @IsString()
  @IsOptional()
  partnerType?: string;

  @IsString()
  @IsOptional()
  partnerId?: string;
}

export class PostJournalEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  description: string;

  // Two lines is the floor for double entry; the service enforces that they
  // balance and that each carries exactly one side.
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];

  @IsDateString()
  @IsOptional()
  entryDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  reference?: string;
}
