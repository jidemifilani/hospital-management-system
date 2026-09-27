import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * A cashier has to be able to work a till without touching the API. This runs
 * a shift the way one is actually worked: open the drawer, sell, then close
 * against a physical count.
 */
test.describe("point of sale", () => {
  let itemName: string;

  test.beforeAll(async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const s = uniqueSuffix();
    itemName = `Counter Item ${s}`;

    const locations = await (
      await request.get(`${API_BASE}/inventory/locations`, { headers })
    ).json();
    // The till sells from the pharmacy counter, so stock has to be there.
    const counter =
      locations.find((l: any) => l.code === "PHARMACY") ?? locations[0];

    const item = await (
      await request.post(`${API_BASE}/inventory/items`, {
        headers,
        data: {
          code: `POS${s}`,
          name: itemName,
          unit: "pack",
          reorderLevel: 2,
          sellingPrice: 1500,
        },
      })
    ).json();

    await request.post(`${API_BASE}/inventory/receive`, {
      headers,
      data: {
        itemId: item.id,
        locationId: counter.id,
        quantity: 40,
        unitCost: 900,
        supplierName: "E2E Supplier",
      },
    });

    // Leave no till open from an earlier run, or opening one is refused.
    // The endpoint answers with an empty body when no till is open.
    const res = await request.get(`${API_BASE}/pos/session/current`, { headers });
    const body = await res.text();
    const current = body ? JSON.parse(body) : null;
    if (current?.id) {
      await request.post(`${API_BASE}/pos/session/${current.id}/close`, {
        headers,
        data: { closingCounted: 0, notes: "Reset before e2e run" },
      });
    }
  });

  test("a cashier opens a till, sells and closes against a count", async ({ page }) => {
    await page.goto("/pos");

    // Nothing can be sold until a drawer is counted in.
    await expect(page.getByText(/no till is open/i)).toBeVisible();
    await page.getByRole("button", { name: /open till/i }).click();

    const openDialog = page.getByRole("dialog");
    await openDialog.getByLabel(/opening float/i).fill("5000");
    await openDialog.getByRole("button", { name: /open till/i }).click();
    await expect(openDialog).toBeHidden();

    // Ring up two packs.
    await page.getByPlaceholder(/search by name or code/i).fill(itemName);
    const row = page.getByRole("row").filter({ hasText: itemName });
    await expect(row).toBeVisible();
    await row.getByRole("button").click();
    await row.getByRole("button").click();

    await expect(page.getByText("₦3,000.00").first()).toBeVisible();

    // Under-tendering must block the sale rather than fail at the server.
    await page.getByLabel(/cash received/i).fill("1000");
    await expect(page.getByText(/short by/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /take payment/i })).toBeDisabled();

    await page.getByLabel(/cash received/i).fill("5000");
    await expect(page.getByText(/change ₦2,000\.00/i)).toBeVisible();
    await page.getByRole("button", { name: /take payment/i }).click();

    await expect(page.getByText(/receipt rcp-/i)).toBeVisible();

    // Close against a deliberately short count.
    await page.getByRole("button", { name: /close till/i }).click();
    const closeDialog = page.getByRole("dialog").filter({ hasText: /close till/i });
    await expect(closeDialog.getByText("₦8,000.00")).toBeVisible();

    await closeDialog.getByLabel(/counted in drawer/i).fill("7500");
    await expect(closeDialog.getByText(/short by ₦500\.00/i)).toBeVisible();
    await closeDialog.getByRole("button", { name: /close till/i }).click();

    await expect(page.getByText(/short by ₦500\.00/i).first()).toBeVisible();
    await expect(page.getByText(/no till is open/i)).toBeVisible();
  });
});
