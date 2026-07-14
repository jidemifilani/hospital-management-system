import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  MinLength,
  MaxLength,
} from "class-validator";
import { Gender, BloodGroup } from "@prisma/client";

export class CreatePatientDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @MinLength(7, { message: "Phone number must be at least 7 digits" })
  @MaxLength(15, { message: "Phone number must not exceed 15 digits" })
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsEnum(BloodGroup)
  @IsOptional()
  bloodGroup?: BloodGroup;

  @IsString()
  @IsOptional()
  allergies?: string;

  @IsString()
  @IsOptional()
  ninNumber?: string;

  @IsString()
  @IsOptional()
  nhisNumber?: string;

  @IsString()
  emergencyContactName: string;

  @IsString()
  emergencyContactPhone: string;

  @IsString()
  emergencyContactRelation: string;
}
