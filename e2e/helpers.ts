import { Page, expect, APIRequestContext } from "@playwright/test";

export const ADMIN = { email: "admin@hostital.ng", password: "admin123456" };
export const API_BASE = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";

export async function login(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(ADMIN.email);
  await page.getByLabel(/password/i).fill(ADMIN.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  // Reaching /dashboard happens before NextAuth has committed the session
  // cookie; navigating immediately races it and bounces back to login.
  await expect
    .poll(async () => (await page.context().cookies()).some((c) => c.name.startsWith("next-auth.session-token")), {
      timeout: 20_000,
    })
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
