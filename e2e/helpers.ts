import { Page, expect, APIRequestContext } from "@playwright/test";

import path from "path";
import fs from "fs";

export const ADMIN = { email: "admin@hostital.ng", password: "admin123456" };

/** Where the shared signed-in session is cached between specs. */
export const STORAGE_STATE = path.join(__dirname, ".auth", "admin.json");
export const API_BASE = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";

export async function login(page: Page) {
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
