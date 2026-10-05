import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Every request body must be something the validation pipe can check.
 *
 * Fifty-six of them were typed `any`, which leaves the pipe nothing to
 * validate against: anything at all was accepted, carried into the service and
 * failed at the database, so the caller got 500 "Internal server error" — true,
 * useless, and indistinguishable from the server being broken.
 *
 * Fixing them one by one would have left the next one, so this is the check.
 * It also catches the subtler version, which is worse because it looks fine:
 * an interface, a union, or `Partial<T>` is erased when the code is compiled,
 * so the pipe receives `Object` and skips validation entirely. A DTO class is
 * the only form that still exists at runtime to be checked against.
 */

const API_SRC = path.resolve(__dirname, "../..");

/**
 * The bodies that are deliberately unvalidated, with the reason.
 *
 * Both are cases where a whitelist would do harm rather than good. The test
 * fails if anything else joins them, and fails if one of these stops being
 * untyped — at which point the note below is no longer true and should go.
 */
const DELIBERATELY_LOOSE: Record<string, string> = {
  "billing/billing.controller.ts":
    "the Paystack webhook: their shape, more fields than we read, and " +
    "authenticity comes from the HMAC over the raw body",
  "site-settings/site-settings.controller.ts":
    "the site settings editor sends whatever keys the edited page has, and " +
    "the set grows with every new section",
};

type BodyParam = { file: string; name: string; type: string };

function controllerFiles(): string[] {
  const found: string[] = [];
  (function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".controller.ts")) found.push(full);
    }
  })(API_SRC);
  return found;
}

function bodyParams(): BodyParam[] {
  const params: BodyParam[] = [];
  for (const file of controllerFiles()) {
    const source = fs.readFileSync(file, "utf8");
    const rel = path.relative(API_SRC, file).replace(/\\/g, "/");
    for (const m of source.matchAll(/@Body\(([^)]*)\)\s*(\w+)\s*:\s*([^,)]+)/g)) {
      // A named property — @Body("status") — extracts one value rather than a
      // document, and is typed as whatever that value is.
      if (m[1]!.trim()) continue;
      params.push({ file: rel, name: m[2]!, type: m[3]!.trim() });
    }
  }
  return params;
}


/** Every .ts file under the API, so a DTO can be found wherever it is declared. */
function allSources(): string[] {
  const found: string[] = [];
  (function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".ts") && !entry.endsWith(".spec.ts")) found.push(full);
    }
  })(API_SRC);
  return found.map((f) => fs.readFileSync(f, "utf8"));
}

/** The body of `class <name>`, wherever it is — a dto/ file or the controller. */
function declarationOf(name: string, sources: string[]): string | null {
  for (const source of sources) {
    // Built from a plain string rather than a template literal, where `\b` is
    // the backspace character and not a word boundary — so the pattern hunted
    // for a control character and reported every class as "not found".
    const start = new RegExp("class " + name + "\\b[^{]*\\{").exec(source);
    if (!start) continue;
    const from = start.index + start[0].length;
    let depth = 1;
    for (let i = from; i < source.length && depth > 0; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      if (depth === 0) return start[0] + source.slice(from, i);
    }
    return source.slice(start.index);
  }
  return null;
}

const params = bodyParams();

/** Types that survive compilation and can therefore be validated. */
const isValidatable = (type: string) => /(^|\b)[A-Z]\w*Dto$/.test(type);

describe("request bodies", () => {
  it("were found, so the rest of this means something", () => {
    // A parse that matched nothing would pass every test below while checking
    // no controller at all.
    expect(params.length).toBeGreaterThan(100);
  });

  it("are all typed as a DTO class the pipe can check", () => {
    const unvalidatable = params
      .filter((p) => !isValidatable(p.type))
      .filter((p) => !(p.file in DELIBERATELY_LOOSE))
      .map((p) => `${p.file}: ${p.name}: ${p.type}`);

    expect(unvalidatable).toEqual([]);
  });

  it("never use a type that is erased at compile time", () => {
    // `any`, an inline object, an interface or `Partial<T>` all leave the pipe
    // with nothing: it sees `Object` and validates nothing, which is the
    // failure that looks like success. PartialType() builds a real class.
    const erased = params
      .filter((p) => /^any$|^\{|^Partial</.test(p.type))
      .filter((p) => !(p.file in DELIBERATELY_LOOSE))
      .map((p) => `${p.file}: ${p.name}: ${p.type}`);

    expect(erased).toEqual([]);
  });

  it("keeps the exceptions honest", () => {
    // If one of the two stops having a loose body, its reason above is stale.
    const stillLoose = new Set(
      params.filter((p) => !isValidatable(p.type)).map((p) => p.file),
    );
    const noLongerNeeded = Object.keys(DELIBERATELY_LOOSE).filter(
      (file) => !stillLoose.has(file),
    );

    expect(noLongerNeeded).toEqual([]);
  });

  it("has a DTO that actually carries validation rules", () => {
    // The other half of the trap, and the one that bites hardest: a class with
    // no decorators whitelists nothing, so the pipe strips every field and then
    // rejects them as unexpected. Creating a department answered 400 "property
    // name should not exist" for an ordinary request for exactly this reason.
    const everySource = allSources();
    const toothless: string[] = [];

    for (const type of new Set(params.filter((p) => isValidatable(p.type)).map((p) => p.type))) {
      const body = declarationOf(type, everySource);
      if (!body) {
        toothless.push(`${type} is referenced but its class was not found`);
        continue;
      }
      // PartialType(X) inherits X's rules, so it needs none of its own.
      if (/extends\s+PartialType\(/.test(body)) continue;
      if (!/@(Is|Min|Max|Length|MaxLength|MinLength|Array|Validate|Type|Allow)\w*\(/.test(body)) {
        toothless.push(`${type} has no validation decorators`);
      }
    }

    expect(toothless).toEqual([]);
  });
});
