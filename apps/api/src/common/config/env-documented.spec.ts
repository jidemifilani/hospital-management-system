import * as fs from "fs";
import * as path from "path";

/**
 * Every configuration key the code reads has to appear in .env.example.
 *
 * .env.example is the only description of what a deployment needs. A key that
 * is read but not listed there is invisible: whoever installs this copies the
 * example, fills it in, and ships without ever learning the name. It does not
 * fail at boot either — `config.get("X", fallback)` quietly uses the fallback,
 * so the deployment looks healthy and is wrong.
 *
 * That is not hypothetical. PAYSTACK_SECRET_KEY was read and undocumented, so
 * a deployment made from the example took payments with an empty key; WEB_URL
 * was read and undocumented, so Paystack sent patients back to localhost after
 * paying.
 */

const ROOT = path.resolve(__dirname, "../../../../..");

/**
 * Names the environment supplies rather than the operator.
 *
 * NODE_ENV and PORT are set by node, the Dockerfile and the test runner;
 * NEXTAUTH_URL is read by next-auth itself rather than through our code, and
 * is listed in the example even though nothing here greps it.
 */
const PROVIDED_BY_THE_RUNTIME = new Set(["NODE_ENV", "PORT"]);

function sources(): string[] {
  const out: string[] = [];
  const roots = [
    path.join(ROOT, "apps/api/src"),
    path.join(ROOT, "apps/web/src"),
    path.join(ROOT, "scripts"),
  ];

  for (const root of roots) {
    (function walk(dir: string) {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx|js)$/.test(entry) && !entry.endsWith(".spec.ts")) out.push(full);
      }
    })(root);
  }
  return out;
}

function keysRead(): Map<string, string> {
  // Which file first reads each key, so a failure says where to look.
  const found = new Map<string, string>();

  for (const file of sources()) {
    const text = fs.readFileSync(file, "utf8");
    const patterns = [
      /process\.env\.([A-Z][A-Z0-9_]*)/g,
      /process\.env\[["']([A-Z][A-Z0-9_]*)["']\]/g,
      /config\.get(?:<[^>]*>)?\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
    ];

    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const key = match[1]!;
        if (!found.has(key)) found.set(key, path.relative(ROOT, file).replace(/\\/g, "/"));
      }
    }
  }
  return found;
}

describe(".env.example", () => {
  const example = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
  const documented = new Set(
    [...example.matchAll(/^\s*#?\s*([A-Z][A-Z0-9_]*)\s*=/gm)].map((m) => m[1]!),
  );

  it("was found and parsed", () => {
    // A parse that matched nothing would make the test below pass while
    // checking nothing at all.
    expect(documented.size).toBeGreaterThan(20);
  });

  it("documents every key the code reads", () => {
    const undocumented = [...keysRead()]
      .filter(([key]) => !documented.has(key) && !PROVIDED_BY_THE_RUNTIME.has(key))
      .map(([key, file]) => `${key} (read in ${file})`)
      .sort();

    expect(undocumented).toEqual([]);
  });
});
