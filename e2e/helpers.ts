import { Page, expect, APIRequestContext } from "@playwright/test";

import path from "path";

export const ADMIN = { email: "admin@hostital.ng", password: "admin123456" };

/** Where the shared signed-in session is cached between specs. */
export const STORAGE_STATE = path.join(__dirname, ".auth", "admin.json");
export const API_BASE = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";

export async function login(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(ADMIN.email);
  await page.getByLabel(/password/i).fill(ADMIN.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  // Reaching /dashboard happens before NextAuth has committed the session, and
  // navigating immediately races it back to the login page. Poll the session
  // endpoint rather than the cookie: it is the authoritative signal, and the
  // generous budget absorbs the dev server compiling a route on first hit.
  await expect
    .poll(
      async () => {
        const res = await page.request.get("/api/auth/session");
        if (!res.ok()) return false;
        const body = await res.json().catch(() => null);
        return Boolean(body?.user?.id);
      },
      { timeout: 45_000, intervals: [250, 500, 1000] },
    )
    .toBe(true);
}

/** Logs in over HTTP and returns a bearer token for seeding fixtures. */
export async function apiToken(request: APIRequestContext) {
  const res = await request.post(`${API_BASE}/auth/login`, { data: ADMIN });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

export function uniqueSuffix() {
  return `${Date.now()}`.slice(-6);
}
