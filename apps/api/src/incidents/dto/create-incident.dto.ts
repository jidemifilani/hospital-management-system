import { IsString, IsOptional, IsDateString } from "class-validator";

// Without decorators the global whitelist pipe rejects every property, which
// made incident reporting impossible.
export class CreateIncidentDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsString() severity: string;
  @IsDateString() incidentDate: string;
  @IsString() @IsOptional() patientId?: string;
  @IsString() @IsOptional() departmentId?: string;
  @IsString() @IsOptional() assignedToId?: string;
}

export class UpdateIncidentDto {
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() assignedToId?: string;
  @IsString() @IsOptional() rootCause?: string;
  @IsString() @IsOptional() correctiveAction?: string;
}
