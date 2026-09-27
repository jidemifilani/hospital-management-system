import { test, expect } from "@playwright/test";
import { apiToken, API_BASE } from "./helpers";

/**
 * Screens fail quietly when the endpoint behind them is broken: a list renders
 * empty, a spinner never resolves, a tile shows zero. Three endpoints were
 * returning 500 and one route did not exist at all, and every one of those
 * surfaced as a plausible-looking screen rather than an error.
 *
 * This walks the endpoints the UI depends on and the shape they must return.
 */

/** Endpoints the dashboard and main screens call with no path parameter. */
const ENDPOINTS = [
  "/alerts", "/appointments", "/appraisals", "/assets", "/attendance", "/audit",
  "/beds", "/beds/occupancy", "/billing/invoices", "/blood-bank/donors",
  "/blood-bank/inventory", "/care-plans", "/catalogue", "/consent",
  "/dashboard/bed-occupancy", "/dashboard/recent-patients", "/dashboard/stats",
  "/dashboard/today-appointments", "/departments", "/dietary/orders",
  "/discharge", "/encounters", "/admissions", "/admissions/census", "/feedback",
  "/handover", "/incidents", "/insurance", "/lab/orders", "/leave",
  "/maintenance", "/opd-queue", "/patients", "/pharmacy/drugs",
  "/pharmacy/prescriptions", "/radiology/orders", "/referrals", "/rehab",
  "/staff", "/theatre", "/training", "/transport", "/triage", "/users",
  "/visitors", "/ward-rounds",
  // Accounting, inventory and POS
  "/accounting/accounts", "/accounting/trial-balance", "/accounting/profit-and-loss",
  "/accounting/balance-sheet", "/accounting/aging/AR", "/accounting/aging/AP",
  "/inventory/items", "/inventory/locations", "/inventory/stock",
  "/inventory/low-stock", "/inventory/movements",
  "/pos/sales",
];

/** Everything that pages must agree on one shape, or consumers read the wrong key. */
const PAGINATED = [
  "/patients", "/staff", "/appointments", "/audit", "/leave",
  "/encounters", "/admissions", "/billing/invoices", "/lab/orders", "/users",
];

test.describe("API contract the UI depends on", () => {
  test("every endpoint the UI calls responds", async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    const broken: string[] = [];
    for (const ep of ENDPOINTS) {
      const res = await request.get(`${API_BASE}${ep}`, { headers });
      if (res.status() !== 200) broken.push(`${ep} → ${res.status()}`);
    }
    expect(broken, "endpoints the UI calls but which do not answer").toEqual([]);
  });

  test("paginated endpoints all return the same shape", async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    const wrong: string[] = [];
    for (const ep of PAGINATED) {
      const body = await (await request.get(`${API_BASE}${ep}?limit=1`, { headers })).json();
      if (!Array.isArray(body.data) || typeof body.total !== "number") {
        wrong.push(`${ep} → ${Object.keys(body).join(",")}`);
      }
    }
    expect(wrong, "must page as { data, total, page, limit, pages }").toEqual([]);
  });

  test("the books balance", async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    const trial = await (
      await request.get(`${API_BASE}/accounting/trial-balance`, { headers })
    ).json();
    expect(trial.balanced, "trial balance debits must equal credits").toBe(true);

    const sheet = await (
      await request.get(`${API_BASE}/accounting/balance-sheet`, { headers })
    ).json();
    expect(sheet.balanced, "assets must equal liabilities plus equity").toBe(true);
  });

  test("a stock receipt names the supplier it created a payable for", async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const stamp = Date.now().toString().slice(-6);
    const supplier = `Contract Supplier ${stamp}`;

    const locations = await (
      await request.get(`${API_BASE}/inventory/locations`, { headers })
    ).json();
    const item = await (
      await request.post(`${API_BASE}/inventory/items`, {
        headers,
        data: { code: `CTR${stamp}`, name: `Contract Item ${stamp}`, unit: "box" },
      })
    ).json();

    await request.post(`${API_BASE}/inventory/receive`, {
      headers,
      data: {
        itemId: item.id,
        locationId: locations[0].id,
        quantity: 4,
        unitCost: 1000,
        supplierName: supplier,
      },
    });

    // A payable that cannot name who is owed cannot be chased or paid. Rows
    // predating supplier capture stay unattributed, so this checks the new
    // posting rather than the whole ledger.
    await expect
      .poll(
        async () => {
          const aging = await (
            await request.get(`${API_BASE}/accounting/aging/AP`, { headers })
          ).json();
          return aging.rows.some((r: any) => r.partnerId === supplier);
        },
        { timeout: 20_000 },
      )
      .toBe(true);
  });

  test("patient EMR routes used by the chart and print view resolve", async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    const patients = await (
      await request.get(`${API_BASE}/patients?limit=1`, { headers })
    ).json();
    const id = patients.data[0]?.id;
    expect(id, "seed data should include at least one patient").toBeTruthy();

    for (const path of ["summary", "vitals", "notes", "diagnoses"]) {
      const res = await request.get(`${API_BASE}/emr/patients/${id}/${path}`, { headers });
      expect(res.status(), `/emr/patients/:id/${path}`).toBe(200);
    }

    // Absent numeric query params must not break the query.
    const withLimit = await request.get(`${API_BASE}/emr/patients/${id}/vitals?limit=20`, {
      headers,
    });
    expect(withLimit.status()).toBe(200);
  });
});
