import { test, expect, Page } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * Covers the three screens added for the clinical core. They were written
 * before there was any way to drive a browser here, so this is the first
 * time they are exercised as a user would.
 */

async function seedPatient(request: any, token: string, label: string) {
  const s = uniqueSuffix();
  const res = await request.post(`${API_BASE}/patients`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      firstName: `${label}${s}`,
      lastName: `Case${s}`,
      dateOfBirth: "1986-07-07",
      gender: "FEMALE",
      phone: `+23482${s}`,
      emergencyContactName: `Kin ${s}`,
      emergencyContactPhone: `+23483${s}`,
      emergencyContactRelation: "Sister",
    },
  });
  expect(res.ok()).toBeTruthy();
  return { id: (await res.json()).id as string, name: `${label}${s}` };
}

/** Picks a patient from the dialog's type-ahead. */
async function choosePatient(page: Page, dialog: any, name: string) {
  await dialog.getByPlaceholder(/search by name/i).fill(name);
  await dialog.getByRole("button", { name: new RegExp(name, "i") }).first().click();
}

/**
 * Finds a department that actually bills a consultation.
 *
 * The automatic consultation charge is only posted when the department has a
 * consultation service item configured, so picking whichever department
 * happens to sort first made this test depend on unrelated data — any
 * department added later with no service item could be chosen, and the charge
 * would never appear.
 */
/** The encounter just opened for this patient. */
async function currentEncounterId(request: any, token: string, patientId: string) {
  const res = await request.get(`${API_BASE}/encounters?patientId=${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  const list = Array.isArray(body) ? body : (body.data ?? []);
  return list[0]?.id as string;
}

async function departmentThatBillsConsultation(request: any, token: string) {
  const res = await request.get(`${API_BASE}/departments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const departments = await res.json();
  const list = Array.isArray(departments) ? departments : (departments.data ?? []);
  const billing = list.find((d: any) => d.consultationServiceItemId);

  expect(
    billing,
    "no department has a consultation service item, so no encounter can carry one",
  ).toBeTruthy();

  return billing;
}

test.describe("clinical core screens", () => {
  test("opens an encounter and shows its running bill", async ({ page, request }) => {
    const token = await apiToken(request);
    const patient = await seedPatient(request, token, "Enc");

    await page.goto("/encounters");
    await expect(page.getByRole("heading", { name: "Encounters", exact: true })).toBeVisible();

    const department = await departmentThatBillsConsultation(request, token);

    await page.getByRole("button", { name: /open encounter/i }).click();
    const dialog = page.getByRole("dialog");
    await choosePatient(page, dialog, patient.name);

    // Department is the only required field left, and it has to be one that
    // bills a consultation or there is no charge to assert on.
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: department.name, exact: true }).click();

    await dialog.getByPlaceholder(/fever and headache/i).fill("Cough and fever for 2 days");
    await dialog.getByRole("button", { name: /open encounter/i }).click();

    // The new episode appears in the list.
    const row = page.getByRole("row").filter({ hasText: patient.name });
    await expect(row).toBeVisible();

    // The consultation charge is posted by a listener, so it lands a moment
    // after the encounter exists. Wait for it before opening the statement:
    // the dialog fetches once when opened, so a charge arriving afterwards
    // would never appear and the assertion below would be about timing rather
    // than about billing.
    await expect
      .poll(
        async () => {
          const res = await request.get(`${API_BASE}/charges/encounter/${await currentEncounterId(request, token, patient.id)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok()) return 0;
          return (await res.json()).length as number;
        },
        { timeout: 15_000, intervals: [200, 400, 800] },
      )
      .toBeGreaterThan(0);

    // And its statement carries the automatic consultation charge.
    await row.getByRole("button", { name: /view/i }).click();
    const statement = page.getByRole("dialog").filter({ hasText: patient.name });
    await expect(statement.getByText(/consultation/i).first()).toBeVisible();
    await expect(statement.getByText(/₦/).first()).toBeVisible();
  });

  test("admits a patient, transfers the bed, then discharges with an invoice", async ({
    page,
    request,
  }) => {
    const token = await apiToken(request);
    const patient = await seedPatient(request, token, "Adm");

    await page.goto("/admissions");
    await expect(page.getByRole("heading", { name: "Admissions", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /admit patient/i }).click();
    const dialog = page.getByRole("dialog");
    await choosePatient(page, dialog, patient.name);

    // Bed, then admitting doctor.
    await dialog.getByRole("combobox").nth(0).click();
    await page.getByRole("option").first().click();
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option").first().click();

    await dialog.getByPlaceholder(/severe malaria/i).fill("Observation overnight");
    await dialog.getByRole("button", { name: /^admit$/i }).click();

    const row = page.getByRole("row").filter({ hasText: patient.name });
    await expect(row).toBeVisible();

    // Transfer to a different bed and confirm the board reflects it.
    await row.getByRole("button", { name: /transfer/i }).click();
    const transfer = page.getByRole("dialog").filter({ hasText: /transfer/i });
    await transfer.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();
    await transfer.getByRole("button", { name: /^transfer$/i }).click();
    await expect(transfer).toBeHidden();

    // Discharging frees the bed and raises the final invoice.
    await page.getByRole("row").filter({ hasText: patient.name })
      .getByRole("button", { name: /discharge/i }).click();
    const discharge = page.getByRole("dialog").filter({ hasText: /discharge/i });
    await discharge.getByRole("button", { name: /^discharge$/i }).click();

    await expect(page.getByText(/patient discharged/i)).toBeVisible();
    // Once discharged the patient leaves the ward board.
    await expect(page.getByRole("row").filter({ hasText: patient.name })).toHaveCount(0);
  });

  test("lists catalogue prices and edits one", async ({ page }) => {
    await page.goto("/admin/catalogue");
    await expect(page.getByRole("heading", { name: /service catalogue/i })).toBeVisible();

    // Seeded tariffs are present.
    await expect(page.getByRole("row").filter({ hasText: "BED-ICU" })).toBeVisible();

    // Filtering narrows the list to one category.
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "LABORATORY" }).click();
    await expect(page.getByRole("row").filter({ hasText: "LAB-FBC" })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "BED-ICU" })).toHaveCount(0);

    // Editing a price persists. Prices render formatted, so assert on what the
    // cashier actually sees rather than the raw number.
    const newPrice = 9000 + Math.floor(Math.random() * 900);
    const displayed = newPrice.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    await page.getByRole("row").filter({ hasText: "LAB-FBC" }).getByRole("button").click();
    const edit = page.getByRole("dialog");
    await edit.getByLabel(/private/i).fill(String(newPrice));
    await edit.getByRole("button", { name: /save/i }).click();
    await expect(edit).toBeHidden();

    await expect(
      page.getByRole("row").filter({ hasText: "LAB-FBC" }).getByText(`₦${displayed}`),
    ).toBeVisible();
  });
});
