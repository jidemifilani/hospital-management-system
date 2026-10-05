import { PartialType } from "@nestjs/mapped-types";
import { CreateClinicalNoteDto } from "./create-clinical-note.dto";

/**
 * A real class, where the handler previously declared
 * `Partial<CreateClinicalNoteDto>`.
 *
 * That difference is the whole point. TypeScript's `Partial<T>` is erased when
 * the code is compiled, so the validation pipe received `Object` as the type to
 * check against and skipped validation altogether — the note's own rules never
 * ran on an update. `PartialType` builds an actual class at runtime with every
 * rule from the create DTO, each made optional.
 */
export class UpdateClinicalNoteDto extends PartialType(CreateClinicalNoteDto) {}
