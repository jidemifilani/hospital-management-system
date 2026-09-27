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
