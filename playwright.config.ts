import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the already-running dev servers (npm run dev).
 * Set E2E_BASE_URL to point at a deployed environment instead.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    // Must match NEXTAUTH_URL — NextAuth session cookies are host-specific,
    // so 127.0.0.1 and localhost are not interchangeable here.
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
