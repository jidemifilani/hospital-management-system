import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * A storekeeper has to be able to receive goods and reconcile a count without
 * an API client. The count case matters most: a shortfall that never reaches
 * the ledger leaves stock value and the balance sheet quietly disagreeing.
 */
test.describe("inventory", () => {
  let itemName: string;
  let itemCode: string;
  let locationName: string;

  test.beforeAll(async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const s = uniqueSuffix();
    itemCode = `INV${s}`;
    itemName = `Store Item ${s}`;

    const locations = await (
      await request.get(`${API_BASE}/inventory/locations`, { headers })
    ).json();
    const location = locations.find((l: any) => l.code === "MAIN_STORE") ?? locations[0];
    locationName = location.name;

    await request.post(`${API_BASE}/inventory/items`, {
      headers,
      data: { code: itemCode, name: itemName, unit: "box", reorderLevel: 5, category: "CONSUMABLE" },
    });
  });

  test("a storekeeper receives stock and it shows on hand", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();

    await page.getByRole("button", { name: /receive stock/i }).click();
    const dialog = page.getByRole("dialog");

    // The item and location pickers are comboboxes, not native selects.
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: new RegExp(itemName) }).click();
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: locationName, exact: true }).click();

    await dialog.getByLabel(/quantity/i).fill("20");
    await dialog.getByLabel(/unit cost/i).fill("250");
    await dialog.getByLabel(/supplier/i).fill("E2E Traders");
    await dialog.getByRole("button", { name: /^receive$/i }).click();
    await expect(dialog).toBeHidden();

    // 20 boxes at ₦250 is ₦5,000 sitting in the store.
    const row = page.getByRole("row").filter({ hasText: itemCode });
    await expect(row).toBeVisible();
    await expect(row).toContainText("20 box");
    await expect(row).toContainText("₦5,000.00");
  });

  test("a count short of the book figure is written to the ledger", async ({ page }) => {
    await page.goto("/inventory");

    await page.getByRole("button", { name: /stock count/i }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: new RegExp(itemName) }).click();
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: locationName, exact: true }).click();

    // The clerk must see what the books claim before entering what they found.
    await expect(dialog.getByText(/book figure: 20/i)).toBeVisible();

    await dialog.getByLabel(/counted on the shelf/i).fill("18");
    await expect(dialog.getByText(/short of 2/i)).toBeVisible();

    await dialog.getByLabel(/reason/i).fill("E2E quarterly count");
    await dialog.getByRole("button", { name: /record count/i }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row").filter({ hasText: itemCode });
    await expect(row).toContainText("18 box");

    // The write-off has to leave stock value and the ledger still agreeing.
    await expect(page.getByText("Agrees")).toBeVisible();
  });
});
