import { IsString, IsOptional, IsNumber, IsPositive, IsEnum } from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class RecordPaymentDto {
  @IsNumber() @IsPositive() amount: number;
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsString() @IsOptional() reference?: string;
  @IsString() @IsOptional() notes?: string;
}
