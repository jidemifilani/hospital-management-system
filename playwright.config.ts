import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./e2e/helpers";

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
  // A warm run is ~14s, but the dev server compiles routes on first request,
  // so a cold navigation can take considerably longer. Deliberately no retries:
  // this guards prescribing, and a retry would hide a genuine intermittent bug.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    // Must match NEXTAUTH_URL — NextAuth session cookies are host-specific,
    // so 127.0.0.1 and localhost are not interchangeable here.
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Signing in is the one step that depends on a dev server having finished
    // booting. It waits for the API first, but an API restart landing mid-flow
    // still loses the attempt — which is what the old intermittent failure
    // was. This environmental step may retry; nothing that asserts on product
    // behaviour does, which is why `retries` stays 0 above.
    { name: "setup", testMatch: /auth\.setup\.ts/, retries: 2 },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },
  ],
});
