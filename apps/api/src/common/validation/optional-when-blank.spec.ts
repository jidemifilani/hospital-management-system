import { ValidationPipe } from "@nestjs/common";
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import * as fs from "fs";
import * as path from "path";
import { OptionalWhenBlank } from "./optional-when-blank.decorator";

enum Colour {
  RED = "RED",
  BLUE = "BLUE",
}

class LooseDto {
  @IsDateString()
  @IsOptional()
  when?: string;
}

class StrictDto {
  @IsDateString()
  @OptionalWhenBlank()
  when?: string;

  @IsEmail()
  @OptionalWhenBlank()
  email?: string;

  @IsEnum(Colour)
  @OptionalWhenBlank()
  colour?: Colour;

  @IsString()
  @IsOptional()
  notes?: string;
}

// The pipe as main.ts configures it. The behaviour below depends on
// enableImplicitConversion, so a copy with different options would prove
// nothing about what the API actually does.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const run = (metatype: unknown, body: unknown) =>
  pipe.transform(body as never, { type: "body", metatype: metatype as never });

describe("the gap this closes", () => {
  it("@IsOptional() does not treat an empty string as absent", async () => {
    // Not a hypothesis: creating a purchase order with Expected Date left
    // blank posted expectedAt: "" and was refused in full.
    await expect(run(LooseDto, { when: "" })).rejects.toThrow();
  });
});

describe("OptionalWhenBlank", () => {
  it("reads a blank date, email and enum as not supplied", async () => {
    const result = (await run(StrictDto, { when: "", email: "", colour: "" })) as StrictDto;

    expect(result.when).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.colour).toBeUndefined();
  });

  it("treats whitespace the same way", async () => {
    expect(((await run(StrictDto, { when: "   " })) as StrictDto).when).toBeUndefined();
  });

  it("still refuses a value that is present but malformed", async () => {
    // The point is to recognise "nothing was entered", not to stop checking.
    await expect(run(StrictDto, { when: "not-a-date" })).rejects.toThrow();
    await expect(run(StrictDto, { email: "bob@" })).rejects.toThrow();
    await expect(run(StrictDto, { colour: "GREEN" })).rejects.toThrow();
  });

  it("passes a real value through untouched", async () => {
    const result = (await run(StrictDto, {
      when: "2026-11-04",
      email: "matron@caresync.ng",
      colour: "RED",
    })) as StrictDto;

    expect(result.when).toBe("2026-11-04");
    expect(result.email).toBe("matron@caresync.ng");
    expect(result.colour).toBe(Colour.RED);
  });

  it("leaves a plain optional string able to be empty", async () => {
    // Blank means absent only where blank could never be a legal value. A
    // free-text field is allowed to be cleared.
    expect(((await run(StrictDto, { notes: "" })) as StrictDto).notes).toBe("");
  });
});

describe("no DTO pairs a format validator with a plain @IsOptional()", () => {
  it("because a form posts the untouched field as an empty string", () => {
    const root = path.resolve(__dirname, "../..");
    const FORMAT =
      /@(IsDateString|IsEmail|IsUrl|IsUUID|IsEnum|IsPhoneNumber|IsNumberString|IsISO8601|IsHexColor)\(/;

    const offenders: string[] = [];

    (function walk(dir: string) {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.endsWith(".dto.ts")) continue;

        // A property is its declaration plus the decorators above it, so the
        // block resets at every declaration and at every blank line.
        let pending: string[] = [];
        for (const line of fs.readFileSync(full, "utf8").split("\n")) {
          const inline = /^\s*@.*[a-zA-Z_]\w*\??:\s*.+;/.test(line);
          const bare = /^\s*[a-zA-Z_]\w*\??:\s*.+;/.test(line);
          const block = inline ? [line] : bare ? [...pending, line] : null;

          if (block) {
            const text = block.join("\n");
            if (FORMAT.test(text) && /@IsOptional\(\)/.test(text)) {
              const name = /([a-zA-Z_]\w*)\??:\s*.+;/.exec(line)?.[1] ?? "?";
              offenders.push(`${path.relative(root, full).replace(/\\/g, "/")}: ${name}`);
            }
            pending = [];
          } else if (/^\s*@[A-Za-z]/.test(line)) {
            pending.push(line);
          } else {
            pending = [];
          }
        }
      }
    })(root);

    // Eighty-four fields across forty DTOs were written this way. Every one
    // of them rejected the whole request when the user left that single
    // field alone — a date, an email or a dropdown nobody had touched.
    expect(offenders).toEqual([]);
  });
});
