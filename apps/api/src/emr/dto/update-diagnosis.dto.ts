import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Updating a diagnosis — resolving it, or adding to the note.
 *
 * Was an inline type, which erases at runtime and left the pipe nothing to
 * check. `resolvedAt` is passed to `new Date()`, so an unparseable value became
 * an Invalid Date rather than a refusal: a diagnosis recorded as resolved at no
 * particular time.
 */
export class UpdateDiagnosisDto {
  @IsString()
  @IsOptional()
  @MaxLength(60)
  status?: string;

  @IsDateString()
  @IsOptional()
  resolvedAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}
