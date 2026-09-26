import { IsString, IsOptional, IsDateString } from "class-validator";

// Without decorators the global whitelist pipe rejects every property.
export class RecordAttendanceDto {
  @IsString() staffId: string;
  @IsDateString() date: string;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
}

export class ClockDto {
  @IsDateString() @IsOptional() time?: string;
}
