import { IsString, IsEnum, IsOptional } from "class-validator";

export enum ReferralTypeDto { INTERNAL = "INTERNAL", EXTERNAL = "EXTERNAL" }
export enum ReferralUrgencyDto { ROUTINE = "ROUTINE", URGENT = "URGENT", EMERGENCY = "EMERGENCY" }

export class CreateReferralDto {
  @IsString() patientId: string;
  @IsEnum(ReferralTypeDto) type: ReferralTypeDto;
  @IsEnum(ReferralUrgencyDto) @IsOptional() urgency?: ReferralUrgencyDto;
  @IsString() reason: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() toStaffId?: string;
  @IsOptional() @IsString() toDepartmentId?: string;
  @IsOptional() @IsString() toFacility?: string;
  @IsOptional() @IsString() appointmentId?: string;
}
