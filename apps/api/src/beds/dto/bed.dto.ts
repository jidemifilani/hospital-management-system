import { IsString, IsOptional, MaxLength, IsNotEmpty } from "class-validator";

export class CreateBedDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  bedNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  ward: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class AdmitToBedDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;
}

export class TransferBedDto {
  @IsString()
  @IsNotEmpty()
  targetBedId: string;
}
