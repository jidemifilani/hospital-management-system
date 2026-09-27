import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

test.describe("patient chart and dashboard", () => {
  test("patient chart lists the patient's episodes of care", async ({ page, request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const s = uniqueSuffix();

    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        headers,
        data: {
          firstName: `Chart${s}`,
          lastName: `Case${s}`,
          dateOfBirth: "1980-02-02",
          gender: "MALE",
          phone: `+23478${s}`,
          emergencyContactName: `Kin ${s}`,
          emergencyContactPhone: `+23479${s}`,
          emergencyContactRelation: "Brother",
        },
      })
    ).json();

    const departments = await (await request.get(`${API_BASE}/departments`, { headers })).json();
    const dept = (departments.data ?? departments).find((d: any) => d.code === "OPD");

    const encounter = await (
      await request.post(`${API_BASE}/encounters`, {
        headers,
        data: {
          patientId: patient.id,
          departmentId: dept.id,
          type: "OUTPATIENT",
          chiefComplaint: `Persistent cough ${s}`,
        },
      })
    ).json();

    await page.goto(`/patients/${patient.id}`);
    await page.getByRole("tab", { name: /episodes/i }).click();

    // The episode, its number, and the complaint that opened it.
    await expect(page.getByText(encounter.encounterNumber)).toBeVisible();
    await expect(page.getByText(`Persistent cough ${s}`)).toBeVisible();
    // Exact, since the department name "Outpatient" also appears on the card.
    await expect(page.getByText("OUTPATIENT", { exact: true })).toBeVisible();
  });

  test("dashboard reports live episode, ward and unbilled figures", async ({ page, request }) => {
    const token = await apiToken(request);
    const stats = await (
      await request.get(`${API_BASE}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json();

    await page.goto("/dashboard");

    const tile = (name: string) =>
      page.locator("a, div").filter({ hasText: new RegExp(`^${name}`) }).first();

    await expect(tile("Active Encounters")).toBeVisible();
    await expect(tile("Admitted Patients")).toBeVisible();
    await expect(tile("Unbilled Charges")).toBeVisible();

    // The episode count on screen matches what the API reports.
    await expect(
      page.getByText(String(stats.activeEncounters), { exact: true }).first(),
    ).toBeVisible();

    // Low stock is a real number now, not a permanent zero.
    expect(stats.lowStockDrugs).toBeGreaterThan(0);
  });
});
