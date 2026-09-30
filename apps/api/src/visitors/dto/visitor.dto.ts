import { IsString, IsOptional, MaxLength, IsNotEmpty } from "class-validator";

/**
 * Visiting is not always about one patient — a contractor or a rep signs in
 * too — so the patient is optional. It used to be passed straight through as
 * whatever the form held, and the form holds an empty string when nobody is
 * selected: Prisma rejected "" as a foreign key and the check-in came back as
 * an opaque 500, which the screen showed as a network error.
 */
export class CheckInVisitorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  idType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  idNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  relationship?: string;

  /**
   * Required, because this is a log of *patient* visitors and the record
   * cannot exist without one. Sending an empty string used to reach Prisma as
   * an id that does not exist and come back as an opaque 500; now the form is
   * told which field is missing.
   */
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  visitPurpose?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
