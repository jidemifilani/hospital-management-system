import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix, assertDistinctFieldNames } from "./helpers";

/**
 * Making one thing out of others moves value without changing how much there
 * is. These drive that through the screen: a recipe, a run, and the finished
 * item appearing in stock costed at what its materials were worth.
 */
test.describe("production", () => {
  let packName: string;
  let recipeName: string;

  test.beforeAll(async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const s = uniqueSuffix();
    packName = `Surgery pack ${s}`;
    recipeName = `Pack recipe ${s}`;

    const locations = await (await request.get(`${API_BASE}/inventory/locations`, { headers })).json();
    const store = locations.find((l: any) => l.code === "MAIN_STORE") ?? locations[0];

    const mk = async (code: string, name: string, unit: string) =>
      (await (
        await request.post(`${API_BASE}/inventory/items`, {
          headers,
          data: { code, name, unit, category: "SURGICAL", reorderLevel: 2 },
        })
      ).json());

    const drape = await mk(`DRP${s}`, `Drape ${s}`, "piece");
    const strip = await mk(`IND${s}`, `Indicator ${s}`, "piece");
    const pack = await mk(`PCK${s}`, packName, "pack");

    for (const [item, cost] of [[drape, 500], [strip, 200]] as const) {
      await request.post(`${API_BASE}/inventory/receive`, {
        headers,
        data: {
          itemId: item.id,
          locationId: store.id,
          quantity: 100,
          unitCost: cost,
          supplierName: "E2E Production Supplier",
        },
      });
    }

    await request.post(`${API_BASE}/production/boms`, {
      headers,
      data: {
        code: `BOM${s}`,
        name: recipeName,
        type: "STERILISATION",
        outputItemId: pack.id,
        outputQuantity: 1,
        shelfLifeDays: 180,
        lines: [
          { itemId: drape.id, quantity: 2 },
          { itemId: strip.id, quantity: 1 },
        ],
      },
    });
  });

  test("a run draws its materials and costs the output from them", async ({ page }) => {
    await page.goto("/production");
    await expect(page.getByRole("heading", { name: "Production" })).toBeVisible();

    await page.getByRole("button", { name: /plan run/i }).click();
    const dialog = page.getByRole("dialog");
    await assertDistinctFieldNames(dialog, "Production · plan a run");

    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: new RegExp(recipeName) }).click();
    await dialog.getByLabel(/how many/i).fill("10");
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option").first().click();

    // The dialog says what it needs and whether the shelf can supply it,
    // before anything is drawn.
    await expect(dialog.getByText(/20 needed/)).toBeVisible();
    await dialog.getByRole("button", { name: /^plan run$/i }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row").filter({ hasText: packName });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Planned");

    await row.getByRole("button", { name: /^complete$/i }).click();
    const complete = page.getByRole("dialog").filter({ hasText: /complete run/i });
    await complete.getByRole("button", { name: /^complete$/i }).click();
    await expect(complete).toBeHidden();

    // 20 drapes at 500 and 10 strips at 200 is 12,000 of materials.
    const done = page.getByRole("row").filter({ hasText: packName });
    await expect(done).toContainText("Completed");
    await expect(done).toContainText("₦12,000.00");
  });

  test("the finished packs reach stock costed from their materials", async ({ page }) => {
    await page.goto("/inventory");

    const row = page.getByRole("row").filter({ hasText: packName });
    await expect(row).toBeVisible();
    await expect(row).toContainText("10 pack");
    // 12,000 of materials over 10 packs.
    await expect(row).toContainText("₦1,200.00");

    // And the books still agree with the shelf, which is the whole point of
    // not expensing the materials on the way through.
    await expect(page.getByText("Agrees")).toBeVisible();
  });
});
