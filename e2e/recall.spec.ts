import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix, assertDistinctFieldNames } from "./helpers";

/**
 * A follow-up date recorded at discharge used to go nowhere: written to the
 * record, read by nothing, and the patient never called. These check that the
 * date reaches a worklist, and that a patient stays on it until somebody
 * actually sees them.
 */
test.describe("patient recall", () => {
  let patientName: string;
  let patientId: string;

  test.beforeAll(async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const s = uniqueSuffix();
    patientName = `Recall${s}`;

    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        headers,
        data: {
          firstName: patientName,
          lastName: `Case${s}`,
          dateOfBirth: "1985-03-03",
          gender: "MALE",
          phone: `0807${s}`,
          emergencyContactName: "Kin",
          emergencyContactPhone: `0808${s}`,
          emergencyContactRelation: "Brother",
        },
      })
    ).json();
    patientId = patient.id;

    const beds = await (await request.get(`${API_BASE}/beds`, { headers })).json();
    const bed = (Array.isArray(beds) ? beds : beds.data)[0];

    // A discharge that records a follow-up — the field that used to be read
    // by nothing at all.
    await request.post(`${API_BASE}/discharge`, {
      headers,
      data: {
        patientId,
        bedId: bed.id,
        dischargeType: "REGULAR",
        dischargeNotes: "Stable",
        // Yesterday, so it lands on the overdue list straight away.
        followUpDate: new Date(Date.now() - 86_400_000).toISOString(),
        followUpInstructions: "Wound review",
      },
    });
  });

  test("a follow-up recorded at discharge reaches the worklist", async ({ page }) => {
    await page.goto("/recalls");
    await expect(page.getByRole("heading", { name: "Patient Recall" })).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: patientName });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Follow-up after discharge");
    await expect(row).toContainText("Wound review");
    await expect(row).toContainText("Due");
  });

  test("contact attempts are recorded, so three tries is evidence", async ({ page }) => {
    await page.goto("/recalls");
    const row = page.getByRole("row").filter({ hasText: patientName });

    await row.getByRole("button", { name: "Record a contact attempt" }).click();
    const dialog = page.getByRole("dialog");
    await assertDistinctFieldNames(dialog, "Recall · contact attempt");

    await dialog.getByLabel(/note/i).fill("Rang twice, no answer");
    await dialog.getByRole("button", { name: /^record$/i }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole("row").filter({ hasText: patientName })).toContainText("1");
  });

  test("closing a recall without seeing the patient needs a reason", async ({ page }) => {
    await page.goto("/recalls");
    const row = page.getByRole("row").filter({ hasText: patientName });

    await row.getByRole("button", { name: "Close without seeing the patient" }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: /close without seeing/i });

    // Dropping someone off a clinical worklist silently is the thing to avoid.
    await expect(dialog.getByRole("button", { name: /close recall/i })).toBeDisabled();

    await dialog.getByLabel(/reason/i).fill("Seen at another clinic");
    await dialog.getByRole("button", { name: /close recall/i }).click();
    await expect(dialog).toBeHidden();

    // Gone from the overdue list, because it is no longer outstanding.
    await expect(page.getByRole("row").filter({ hasText: patientName })).toHaveCount(0);
  });
});
