import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
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
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

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

  @IsStrictBoolean()
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

// ── Bank Reconciliation DTOs ──────────────────────────────────────────────────

export class CreateBankAccountDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @IsString() @IsNotEmpty() @MaxLength(80)  bankName: string;
  @IsString() @IsNotEmpty() @MaxLength(40)  accountNumber: string;
  @IsString() @IsNotEmpty()                 glAccountId: string;
  @IsString() @IsOptional()                 currency?: string;
}

export class StatementLineDto {
  @IsDateString()           valueDate: string;
  @IsString() @IsNotEmpty() @MaxLength(240) description: string;
  @IsString() @IsOptional() @MaxLength(80)  reference?: string;
  @IsNumber() @Min(0)                       amount: number;
  @IsEnum({ DEBIT: "DEBIT", CREDIT: "CREDIT" }) lineType: "DEBIT" | "CREDIT";
}

export class ImportStatementDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StatementLineDto)
  lines: StatementLineDto[];
}

export class MatchLineDto {
  @IsString() @IsOptional() matchedPaymentId?: string;
  @IsString() @IsOptional() matchedEntryId?: string;
}
