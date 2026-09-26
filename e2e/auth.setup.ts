import { test as setup } from "@playwright/test";
import { login, STORAGE_STATE } from "./helpers";

/**
 * Signs in once and saves the session for every spec to reuse.
 *
 * Logging in per test meant four sign-ins against a dev server that compiles
 * routes on demand, which was both the bulk of the runtime and the source of
 * the intermittent failures.
 */
setup("authenticate", async ({ page }) => {
  await login(page);
  await page.context().storageState({ path: STORAGE_STATE });
});
