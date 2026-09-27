import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * Patient lookup was silently broken on several screens. /patients paginated
 * as {items} while these components read r.data.data, so the type-ahead
 * always resolved to an empty list — no error, just a search that never found
 * anyone. Now that every endpoint pages as {data}, this guards the repair.
 */
test.describe("patient lookup", () => {
  let patientName: string;

  test.beforeAll(async ({ request }) => {
    const token = await apiToken(request);
    const s = uniqueSuffix();
    patientName = `Lookup${s}`;

    const res = await request.post(`${API_BASE}/patients`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        firstName: patientName,
        lastName: `Find${s}`,
        dateOfBirth: "1984-04-04",
        gender: "FEMALE",
        phone: `+23471${s}`,
        emergencyContactName: `Kin ${s}`,
        emergencyContactPhone: `+23470${s}`,
        emergencyContactRelation: "Sister",
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("finds a patient from the OPD queue screen", async ({ page }) => {
    await page.goto("/opd-queue");
    await page.getByRole("button", { name: /add (patient )?to queue|add patient/i }).first().click();

    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder(/name or mrn/i).fill(patientName);

    // Previously this list stayed empty no matter what was typed.
    await expect(dialog.getByText(new RegExp(patientName, "i")).first()).toBeVisible();
  });

  test("patients list itself renders rows", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.getByRole("row").filter({ hasText: patientName })).toBeVisible();
  });
});
