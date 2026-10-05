import * as fs from "node:fs";
import * as path from "node:path";
import { ValidationPipe } from "@nestjs/common";
import { IsBoolean, IsOptional } from "class-validator";
import { IsStrictBoolean } from "./is-strict-boolean.decorator";

/**
 * Runs the real pipe, configured exactly as main.ts configures it.
 *
 * That configuration is the whole point: `enableImplicitConversion` coerces an
 * incoming value to the declared type before any validator looks at it, and
 * for a boolean that coercion is truthy. So `"false"` became `true` and
 * `@IsBoolean()` then passed, because by then the value was a perfectly good
 * boolean. Testing the decorator in isolation would miss it entirely — the bug
 * lives in the interaction.
 */

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

class StrictDto {
  @IsStrictBoolean()
  flag: boolean;
}

/** How the codebase used to declare these, kept here to show the difference. */
class LooseDto {
  @IsBoolean()
  @IsOptional()
  flag?: boolean;
}

const run = <T>(cls: new () => T, value: unknown) =>
  pipe.transform({ flag: value } as never, { type: "body", metatype: cls as never });

describe("the implicit conversion this guards against", () => {
  it("turns the string \"false\" into true on a plain @IsBoolean", async () => {
    // Not a hypothesis: this is what shipped. A pay component sent with
    // isDeduction: "false" was stored as a deduction — an allowance recorded as
    // money taken off somebody's pay.
    const result = (await run(LooseDto, "false")) as LooseDto;

    expect(result.flag).toBe(true);
  });
});

describe("IsStrictBoolean", () => {
  it("reads \"false\" as false", async () => {
    expect(((await run(StrictDto, "false")) as StrictDto).flag).toBe(false);
  });

  it("reads \"true\" as true", async () => {
    expect(((await run(StrictDto, "true")) as StrictDto).flag).toBe(true);
  });

  it("passes real booleans through untouched", async () => {
    expect(((await run(StrictDto, true)) as StrictDto).flag).toBe(true);
    expect(((await run(StrictDto, false)) as StrictDto).flag).toBe(false);
  });

  it("refuses anything else rather than guessing", async () => {
    // 1, "yes" and "" are all things a caller might mean by true or false, and
    // guessing which is how the original bug happened. Being told is better.
    for (const value of [1, 0, "yes", "no", "", "FALSE", null, {}]) {
      await expect(run(StrictDto, value)).rejects.toThrow();
    }
  });

  it("still requires the field when it is not optional", async () => {
    await expect(
      pipe.transform({} as never, { type: "body", metatype: StrictDto as never }),
    ).rejects.toThrow();
  });
});

describe("no DTO goes back to a plain @IsBoolean", () => {
  it("because the implicit conversion makes it mean the wrong thing", () => {
    const root = path.resolve(__dirname, "../..");

    const offenders: string[] = [];
    (function walk(dir: string) {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (entry.endsWith(".dto.ts") && /@IsBoolean\(/.test(fs.readFileSync(full, "utf8"))) {
          offenders.push(path.relative(root, full).replace(/\\/g, "/"));
        }
      }
    })(root);

    // Twenty-five fields across sixteen DTOs were written this way, including
    // acknowledgeWarnings on a prescription — where a clinician sending
    // "false" would have been recorded as accepting drug-interaction warnings
    // they had refused.
    expect(offenders).toEqual([]);
  });
});
