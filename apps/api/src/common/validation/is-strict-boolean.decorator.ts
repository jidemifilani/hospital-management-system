import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsBoolean, type ValidationOptions } from "class-validator";

/**
 * A boolean that cannot be turned into the wrong boolean on the way in.
 *
 * The global pipe runs with `transformOptions: { enableImplicitConversion:
 * true }`, which coerces an incoming value to the property's declared type
 * before any validator sees it. For a boolean that coercion is truthy, so the
 * string `"false"` arrives as `true` — and `@IsBoolean()` then passes, because
 * by the time it looks the value is a perfectly good boolean. The request is
 * accepted and means the opposite of what was sent.
 *
 * Found in payroll, where a pay component sent with `isDeduction: "false"` was
 * stored as a deduction: an allowance recorded as money taken off somebody's
 * pay. The same coercion applied to every boolean in the API, including
 * `acknowledgeWarnings` on a prescription, where it would record a clinician as
 * having accepted drug-interaction warnings they had explicitly not accepted.
 *
 * An explicit `@Transform` takes precedence over the implicit conversion, so
 * this maps the two strings a form or query string legitimately produces and
 * leaves everything else alone for `@IsBoolean` to refuse. `1` and `"yes"` are
 * deliberately not accepted: a caller that cannot send a boolean should be told
 * so rather than guessed at.
 */
export function IsStrictBoolean(options?: ValidationOptions) {
  return applyDecorators(
    // Reads `obj`, the original plain object, rather than `value`.
    //
    // That distinction is the fix. `value` has already been through the
    // implicit conversion by the time a transform runs, so it arrives as
    // `true` and there is no longer a `"false"` to recognise — the first
    // attempt at this inspected `value` and did nothing at all. `obj` is the
    // body as it was received.
    Transform(({ obj, key }) => {
      const raw = (obj as Record<string, unknown> | undefined)?.[key];
      if (typeof raw === "boolean") return raw;
      if (raw === "true") return true;
      if (raw === "false") return false;
      // Anything else is handed on unchanged for IsBoolean to refuse.
      return raw;
    }),
    IsBoolean(options),
  );
}
