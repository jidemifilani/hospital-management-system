import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsOptional } from "class-validator";

/**
 * Optional, and an empty string counts as not supplied.
 *
 * `@IsOptional()` skips validation for `undefined` and `null` only. An empty
 * string is neither, so a format validator beside it still runs and still
 * fails — `@IsDateString() @IsOptional()` rejects `""`, and so does
 * `@IsEmail() @IsOptional()`.
 *
 * That matters because a controlled React input holds `""` when the user
 * leaves it alone, and these forms post their whole state object. Creating a
 * purchase order without filling in Expected Date or the vendor's email sent
 * `expectedAt: ""` and `vendorEmail: ""`, and `forbidNonWhitelisted` turned
 * each into a 400 for the entire order — the one field nobody filled in
 * rejecting the twelve that were.
 *
 * Blank is how a form says "none", so this maps it to `undefined` before
 * `@IsOptional()` looks, leaving the field genuinely absent. A value that is
 * present but malformed still reaches the validator and is still refused.
 *
 * Only for fields where blank means absent. A string field that is allowed to
 * be empty wants a plain `@IsOptional()`, and one that must be filled in wants
 * `@IsNotEmpty()`.
 */
export function OptionalWhenBlank() {
  return applyDecorators(
    Transform(({ value }) => (typeof value === "string" && value.trim() === "" ? undefined : value)),
    IsOptional(),
  );
}
