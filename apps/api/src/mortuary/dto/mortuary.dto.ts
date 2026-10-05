import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Mortuary records.
 *
 * The deceased's name and the date of death are required. Off an untyped body
 * either could be absent, and a mortuary record that does not say who it is
 * for is not a record of anything.
 */
export class AdmitToMortuaryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  deceasedName: string;

  @IsDateString()
  deathDate: string;

  /** Present where the deceased was a patient here; absent for a body brought in. */
  @IsString()
  @IsOptional()
  patientId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  causeOfDeath?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  storageUnit?: string;

  /**
   * Next of kin is required, as both columns are NOT NULL. Absent, they went
   * to the database as `undefined` and came back as a 500 — so the request was
   * refused either way, just without saying which field was missing. A
   * mortuary record exists partly so somebody can be contacted.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nextOfKinName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  nextOfKinPhone: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nextOfKinRelation?: string;
}

export class ReleaseFromMortuaryDto {
  /**
   * Who the body was released to. Required: this is the field the record
   * exists to answer, and it was read off an `any` where absent meant nothing
   * was stored.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  releasedTo: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  releaseNotes?: string;
}
