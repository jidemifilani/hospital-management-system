import { IsString, IsNotEmpty, IsInt, IsOptional, IsNumber, Min, Max } from "class-validator";

export class SetBudgetDto {
  @IsString() @IsNotEmpty() accountId: string;
  @IsInt() @Min(2000) @Max(2100) year: number;
  @IsInt() @Min(1) @Max(12) @IsOptional() month?: number;
  @IsNumber() @Min(0) budgetedAmount: number;
  @IsString() @IsOptional() notes?: string;
}

export class DeleteBudgetDto {
  @IsString() @IsNotEmpty() accountId: string;
  @IsInt() @Min(2000) @Max(2100) year: number;
  @IsInt() @Min(1) @Max(12) @IsOptional() month?: number;
}
