import { test, expect } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

/**
 * Creating a department was impossible: the DTO carried no validation
 * decorators, so the global whitelist stripped every field and then rejected
 * them as unexpected. The screen reported only "Failed to create department",
 * because it read the raw axios error shape that the API client no longer
 * throws — so the reason never reached anyone.
 */
test.describe("departments", () => {
  test("a department can be created from the screen", async ({ page }) => {
    const s = uniqueSuffix();
    const name = `Cardiology ${s}`;

    await page.goto("/departments");
    await page.getByRole("button", { name: /new department|add department|create department/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/name/i).fill(name);
    await dialog.getByLabel(/code/i).fill(`CD${s}`);
    await dialog.getByLabel(/description/i).fill("Heart unit");
    await dialog.getByRole("button", { name: /create|save|add/i }).last().click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(name)).toBeVisible();
  });

  test("a duplicate code is refused with the server's own reason", async ({ page }) => {
    const s = uniqueSuffix();
    const code = `DUP${s}`;

    await page.goto("/departments");

    // First one succeeds.
    await page.getByRole("button", { name: /new department|add department|create department/i })
      .first()
      .click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel(/name/i).fill(`First ${s}`);
    await dialog.getByLabel(/code/i).fill(code);
    await dialog.getByRole("button", { name: /create|save|add/i }).last().click();
    await expect(dialog).toBeHidden();

    // The second must say *why* it failed, not just that it did.
    await page.getByRole("button", { name: /new department|add department|create department/i })
      .first()
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(/name/i).fill(`Second ${s}`);
    await dialog.getByLabel(/code/i).fill(code);
    await dialog.getByRole("button", { name: /create|save|add/i }).last().click();

    await expect(page.getByText(/already exists/i)).toBeVisible();
  });
});
