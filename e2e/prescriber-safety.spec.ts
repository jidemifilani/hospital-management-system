import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * The safety gate is the one screen where a wrong click can harm someone, so
 * this asserts the guard actually blocks — not merely that it renders.
 */
test.describe("prescriber clinical safety gate", () => {
  let patientName: string;
  let drugName: string;

  test.beforeAll(async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const s = uniqueSuffix();

    patientName = `Gate${s}`;
    drugName = `Sulfadrug ${s}`;

    const patient = await request.post(`${API_BASE}/patients`, {
      headers,
      data: {
        firstName: patientName,
        lastName: `Test${s}`,
        dateOfBirth: "1990-01-01",
        gender: "FEMALE",
        phone: `+23490${s}`,
        allergies: "Sulfa drugs",
        emergencyContactName: `Kin ${s}`,
        emergencyContactPhone: `+23491${s}`,
        emergencyContactRelation: "Sister",
      },
    });
    expect(patient.ok()).toBeTruthy();

    const drug = await request.post(`${API_BASE}/pharmacy/drugs`, {
      headers,
      data: {
        name: drugName,
        genericName: "Co-trimoxazole (sulfa drugs)",
        code: `SUL${s}`,
        category: "Antibiotic",
        unit: "tablet",
        sellingPrice: 120,
        reorderLevel: 20,
      },
    });
    expect(drug.ok()).toBeTruthy();
  });

  test("blocks a contraindicated drug until the prescriber acknowledges", async ({ page }) => {
    await page.goto("/pharmacy");

    await page.getByRole("button", { name: /new prescription/i }).click();
    const form = page.getByRole("dialog");
    await expect(form.getByText("New Prescription")).toBeVisible();

    // Pick the allergic patient.
    await form.getByPlaceholder(/search by name/i).fill(patientName);
    await form.getByRole("button", { name: new RegExp(patientName, "i") }).first().click();

    // Pick the contraindicated drug.
    await form.getByRole("combobox").first().click();
    await page.getByRole("option", { name: drugName }).click();

    await form.getByPlaceholder("Dosage").fill("960mg");
    await form.getByPlaceholder("Duration").fill("5 days");
    await form.getByPlaceholder("Qty").fill("10");

    await form.getByRole("button", { name: /^prescribe$/i }).click();

    // The gate must appear, naming the allergen.
    const gate = page.getByRole("dialog").filter({ hasText: "Clinical safety check" });
    await expect(gate).toBeVisible();
    await expect(gate.getByText(/allergy to "sulfa drugs"/i)).toBeVisible();
    await expect(gate.getByText(new RegExp(`${drugName} may be contraindicated`, "i"))).toBeVisible();

    // Override must stay disabled until the prescriber ticks the acknowledgement.
    const override = gate.getByRole("button", { name: /prescribe anyway/i });
    await expect(override).toBeDisabled();

    await page.screenshot({ path: "e2e/artifacts/safety-gate.png", fullPage: true });

    await gate.getByRole("checkbox").check();
    await expect(override).toBeEnabled();

    await override.click();

    // Overriding succeeds and closes both dialogs.
    await expect(gate).toBeHidden();
    await expect(page.getByText(/prescription created/i)).toBeVisible();
  });
});
