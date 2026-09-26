import { IsString, IsOptional } from "class-validator";

// Without decorators the global whitelist pipe rejects every property, which
// made this endpoint refuse its own payload.
export class CreateQueueDto {
  @IsString() patientId: string;
  @IsString() departmentId: string;
  @IsString() @IsOptional() doctorId?: string;
  @IsString() @IsOptional() appointmentId?: string;
  @IsString() @IsOptional() notes?: string;
}
