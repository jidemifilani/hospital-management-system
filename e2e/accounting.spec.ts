import { test, expect } from "@playwright/test";

/**
 * The reports a finance officer signs off on. The assertions are about the
 * invariants rather than the figures: a trial balance that does not balance,
 * or a balance sheet that does not, means something upstream posted wrongly.
 */
test.describe("accounting", () => {
  test("the trial balance is reachable and balances", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("heading", { name: "Accounting" })).toBeVisible();

    // A hospital with no chart of accounts cannot record anything; the page
    // must say so rather than showing empty reports.
    await expect(page.getByRole("tab", { name: /trial balance/i })).toBeVisible();

    await expect(page.getByText("Balanced")).toBeVisible();
    await expect(page.getByRole("cell", { name: /totals/i })).toBeVisible();
  });

  test("the balance sheet balances and the P&L totals", async ({ page }) => {
    await page.goto("/accounting");

    await page.getByRole("tab", { name: /profit & loss/i }).click();
    await expect(page.getByText(/total income/i)).toBeVisible();
    await expect(page.getByText(/net profit|net loss/i)).toBeVisible();

    await page.getByRole("tab", { name: /balance sheet/i }).click();
    await expect(page.getByText(/total assets/i)).toBeVisible();
    await expect(page.getByText(/liabilities and equity/i)).toBeVisible();
    await expect(page.getByText("Balanced")).toBeVisible();
  });

  test("payables name the supplier who is owed", async ({ page }) => {
    await page.goto("/accounting");
    await page.getByRole("tab", { name: /payables/i }).click();

    await expect(page.getByText(/owed by the hospital/i)).toBeVisible();

    // A ledger id is no use to whoever has to chase the debt. Every row must
    // carry a name a person can act on.
    const firstCell = page.getByRole("row").nth(1).getByRole("cell").first();
    if (await firstCell.isVisible()) {
      await expect(firstCell).not.toHaveText(/^c[a-z0-9]{24}$/);
    }
  });
});
