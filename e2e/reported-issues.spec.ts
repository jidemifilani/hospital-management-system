import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * Four things reported from actually using the app. Each was a different way
 * of failing quietly: a link to a page that did not exist, a form asking for a
 * database id, a result that could not leave the screen, and an error message
 * the screen threw away.
 */
test.describe("reported issues", () => {
  test("a patient can be edited from the table", async ({ page }) => {
    await page.goto("/patients");

    const firstRow = page.getByRole("row").nth(1);
    await expect(firstRow).toBeVisible();
    const name = (await firstRow.getByRole("cell").first().innerText()).split("\n")[0]!.trim();

    // The Edit action linked to a page that was never built, so it 404'd.
    await firstRow.getByRole("button").last().click();
    await page.getByRole("menuitem", { name: /edit/i }).click();

    await expect(page.getByRole("heading", { name: /^Edit / })).toBeVisible();
    // The form starts from what is on record rather than empty.
    await expect(page.getByLabel("First Name")).not.toHaveValue("");
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible();
  });

  test("checking a visitor in finds the patient by name, not by id", async ({ page, request }) => {
    const token = await apiToken(request);
    const patients = await (
      await request.get(`${API_BASE}/patients?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json();
    const patient = patients.data[0];
    const s = uniqueSuffix();

    await page.goto("/visitors");
    await page.getByRole("button", { name: /check in/i }).first().click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/first name/i).fill(`Vis${s}`);
    await dialog.getByLabel(/last name/i).fill(`Itor${s}`);

    // Submitting is impossible until a real patient is chosen, rather than
    // failing afterwards on a foreign key nobody could see.
    await expect(dialog.getByRole("button", { name: /^check in$/i })).toBeDisabled();

    await dialog.getByLabel(/patient being visited/i).fill(patient.mrn);
    await dialog.getByRole("button", { name: new RegExp(patient.mrn) }).click();
    await expect(dialog.getByText(/^Selected /)).toBeVisible();

    await dialog.getByRole("button", { name: /^check in$/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(`Vis${s}`)).toBeVisible();
  });

  test("a verified lab result can be printed", async ({ page, request }) => {
    const token = await apiToken(request);
    const orders = await (
      await request.get(`${API_BASE}/lab/orders?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json();
    const list = Array.isArray(orders) ? orders : (orders.data ?? []);
    const withResults = list.find((o: any) => ["RESULTED", "VERIFIED"].includes(o.status));
    test.skip(!withResults, "no resulted lab order in this database to print");

    await page.goto(`/print/lab/${withResults.id}`);

    // The report has to stand on its own on paper: who it is about, what was
    // measured, and against what reference.
    await expect(page.getByText("Laboratory Report")).toBeVisible();
    // The order number sits beside its label in the same paragraph, so it is
    // read from the rendered text rather than matched as a standalone node.
    await expect(page.locator("body")).toContainText(withResults.orderNumber);
    await expect(page.getByRole("columnheader", { name: "Reference" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Result" })).toBeVisible();
  });

  test("a dispense that cannot be filled says why", async ({ page, request }) => {
    const token = await apiToken(request);
    const res = await request.get(`${API_BASE}/pharmacy/prescriptions?limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body.data ?? []);
    const pending = list.find((p: any) => p.status === "PENDING");
    test.skip(!pending, "no pending prescription to dispense");

    await page.goto("/pharmacy");
    const row = page.getByRole("row").filter({ hasText: pending.prescriptionNo });
    await expect(row).toBeVisible();
    await row.click();

    await page.getByRole("button", { name: /dispense/i }).first().click();

    // Previously this said only "Failed to dispense", which told a pharmacist
    // nothing about which drug was short or by how much.
    await expect(page.getByText(/insufficient stock|out of stock|need \d+/i)).toBeVisible();
  });
});
