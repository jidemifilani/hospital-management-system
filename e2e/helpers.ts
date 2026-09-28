import { Page, Locator, expect, APIRequestContext } from "@playwright/test";

import path from "path";
import fs from "fs";

export const ADMIN = { email: "admin@hostital.ng", password: "admin123456" };

/** Where the shared signed-in session is cached between specs. */
export const STORAGE_STATE = path.join(__dirname, ".auth", "admin.json");
export const API_BASE = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Waits for the API to answer before anything tries to sign in.
 *
 * Signing in goes through the web server, which calls the API server-side. If
 * the API is mid-restart — as it is for a few seconds after any change to it
 * under `nest --watch` — that call fails, no session is created, and the whole
 * suite falls over on the first step. This was the intermittent failure: not a
 * race in the app, just a dev server that had not finished booting.
 */
export async function waitForApi(request: APIRequestContext, budgetMs = 60_000) {
  const deadline = Date.now() + budgetMs;
  let last = "never answered";

  while (Date.now() < deadline) {
    try {
      const res = await request.get(`${API_BASE}/health`, { timeout: 5_000 });
      if (res.ok()) return;
      last = `HTTP ${res.status()}`;
    } catch (err) {
      last = err instanceof Error ? err.message.split("\n")[0]! : String(err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(
    `The API at ${API_BASE} did not become ready within ${budgetMs}ms (${last}). ` +
      `Start it with "npm run dev", or wait for it to finish restarting.`,
  );
}

export async function login(page: Page) {
  await waitForApi(page.request);
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(ADMIN.email);
  await page.getByLabel(/password/i).fill(ADMIN.password);

  // Record the sign-in exchange purely as evidence. NextAuth answers 200 even
  // when authorize() rejected, putting the reason in the returned URL, so
  // without this every cause — throttled, API down, bad password — surfaced as
  // the same opaque timeout on the poll below. This never fails the run on its
  // own; the session poll stays the single authority on whether sign-in worked.
  let evidence = "no sign-in response was observed";
  const callback = page
    .waitForResponse((r) => r.url().includes("/api/auth/callback/credentials"), {
      timeout: 30_000,
    })
    .catch(() => null);

  await page.getByRole("button", { name: /sign in/i }).click();

  const res = await callback;
  if (res) {
    const body = await res.text().catch(() => "");
    const reason = decodeURIComponent(body).match(/error=([^"&]+)/)?.[1];
    evidence = `callback returned ${res.status()}${reason ? `, error "${reason}"` : ", no error reported"}`;
  }

  // Wait for the session cookie before following the redirect. The app pushes
  // to /dashboard as soon as sign-in returns, and the dashboard layout asks
  // the server who you are: arriving a moment before the cookie is stored
  // sends you straight back to the login page, which is what the occasional
  // "signed in but the session never committed" failure actually was.
  await expect
    .poll(
      async () =>
        (await page.context().cookies()).some(
          (c) => c.name.includes("next-auth.session-token") && c.value.length > 0,
        ),
      { timeout: 20_000, intervals: [100, 200, 400] },
    )
    .toBe(true);

  await page.waitForURL(/\/dashboard/, { timeout: 30_000 }).catch(() => {
    throw new Error(`Sign-in never reached the dashboard — ${evidence}.\n${SIGNIN_HINTS}`);
  });

  // Reaching /dashboard happens before NextAuth has committed the session, and
  // navigating immediately races it back to the login page. Poll the session
  // endpoint rather than the cookie: it is the authoritative signal, and the
  // generous budget absorbs the dev server compiling a route on first hit.
  const settled = await expect
    .poll(
      async () => {
        const probe = await page.request.get("/api/auth/session");
        if (!probe.ok()) return false;
        const body = await probe.json().catch(() => null);
        return Boolean(body?.user?.id);
      },
      { timeout: 45_000, intervals: [250, 500, 1000] },
    )
    .toBe(true)
    .then(() => true)
    .catch(() => false);

  if (!settled) {
    throw new Error(
      `Signed in but the session never committed — ${evidence}; ` +
        `ended on ${page.url()}.\n${SIGNIN_HINTS}`,
    );
  }
}

const SIGNIN_HINTS = [
  "  TOO_MANY_ATTEMPTS   the per-account login limit tripped — raise LOGIN_RATE_LIMIT",
  "                      in .env, or restart the API to clear the in-memory counter.",
  "  SERVICE_UNAVAILABLE the API was unreachable from the web server (often a restart).",
  "  CredentialsSignin   the API rejected these credentials.",
].join("\n");

const TOKEN_CACHE = path.join(__dirname, ".auth", "api-token.json");
/** Well inside the API's 15-minute access token lifetime. */
const TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * Returns a bearer token for seeding fixtures, reusing one across specs.
 *
 * Every spec calling this separately meant nine sign-ins per run, which is
 * both wasted time and enough to trip the per-account login limit — the suite
 * locked itself out. The cache is on disk because Playwright gives each spec
 * file its own module registry, so an in-process variable would not be shared.
 */
export async function apiToken(request: APIRequestContext) {
  await waitForApi(request);

  try {
    const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE, "utf8")) as {
      token: string;
      at: number;
    };
    if (Date.now() - cached.at < TOKEN_TTL_MS && cached.token) return cached.token;
  } catch {
    // No usable cache — sign in below.
  }

  const res = await request.post(`${API_BASE}/auth/login`, { data: ADMIN });
  if (!res.ok()) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Could not obtain an API token (HTTP ${res.status()}). ${body.slice(0, 200)}\n` +
        `A 429 here means recent sign-ins tripped the per-account login limit; ` +
        `restart the API or wait for the window to pass.`,
    );
  }

  const token = (await res.json()).accessToken as string;
  expect(token).toBeTruthy();
  fs.mkdirSync(path.dirname(TOKEN_CACHE), { recursive: true });
  fs.writeFileSync(TOKEN_CACHE, JSON.stringify({ token, at: Date.now() }), "utf8");
  return token;
}

export function uniqueSuffix() {
  return `${Date.now()}`.slice(-6);
}

/**
 * The accessible name of every form control inside a scope.
 *
 * Computed the way a label lookup resolves one: an explicit aria-label first,
 * then a label bound by `for`, then a wrapping label, then the placeholder.
 */
async function fieldNames(scope: Locator): Promise<{ name: string; tag: string }[]> {
  return scope
    .locator('input:not([type="hidden"]), textarea, select')
    .evaluateAll((elements) =>
      elements.map((el) => {
        const node = el as HTMLInputElement;
        const byAria = node.getAttribute("aria-label");
        const byFor = node.id
          ? document.querySelector(`label[for="${CSS.escape(node.id)}"]`)
          : null;
        const wrapping = node.closest("label");

        const name =
          byAria ??
          (byFor as HTMLElement | null)?.innerText ??
          (wrapping as HTMLElement | null)?.innerText ??
          node.getAttribute("placeholder") ??
          "";

        return { name: name.replace(/\s+/g, " ").trim(), tag: node.type || node.tagName.toLowerCase() };
      }),
    );
}

/**
 * Fails when one field's name contains another's.
 *
 * That is exactly the condition that makes a substring label lookup ambiguous,
 * and it has bitten this suite twice — a checkbox whose label read "…does not
 * count as replying to them" answered to "reply" alongside the Reply box, and
 * the test only discovered it at the moment that line ran. Checking the form
 * itself catches the problem whether or not a test happens to touch the field,
 * and a field whose name swallows another's is a confusing form regardless.
 */
export async function assertDistinctFieldNames(scope: Locator, where: string) {
  const all = await fieldNames(scope);
  const fields = all.filter((f) => f.name.length > 0);

  // A check that found nothing has not passed, it has not run. The first
  // version of this silently approved a dialog that was still showing its
  // loading spinner, which is precisely the kind of quiet success it exists
  // to catch.
  expect(
    all.length,
    `${where}: no form fields were found — the form had not rendered, so nothing was checked`,
  ).toBeGreaterThan(0);

  expect(
    fields.length,
    `${where}: ${all.length} field(s) present but none has a name, so none can be found by label`,
  ).toBeGreaterThan(0);

  const clashes: string[] = [];
  for (const a of fields) {
    for (const b of fields) {
      if (a === b) continue;
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      if (an === bn) {
        if (a.name < b.name || (a.name === b.name && fields.indexOf(a) < fields.indexOf(b))) {
          clashes.push(`two ${a.tag} fields are both named "${a.name}"`);
        }
      } else if (bn.includes(an)) {
        clashes.push(`"${b.name}" contains "${a.name}", so a lookup for the shorter matches both`);
      }
    }
  }

  expect(
    [...new Set(clashes)],
    `${where}: field names must not overlap, or a label lookup cannot tell them apart`,
  ).toEqual([]);
}
