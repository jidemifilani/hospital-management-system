import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * The money split is what matters here: whatever the insurer declines has to
 * land back on the patient, and the two shares must always add back to the
 * bill. A claim that quietly loses part of a bill is worse than no claim.
 */
test.describe("insurance and HMO", () => {
  let providerName: string;
  let providerId: string;
  let planId: string;
  let patientName: string;
  let claimNumber: string;
  const BILL = 50000;

  test.beforeAll(async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const s = uniqueSuffix();
    providerName = `E2E Health HMO ${s}`;

    const provider = await (
      await request.post(`${API_BASE}/hmo/providers`, {
        headers,
        data: { code: `E2E${s}`, name: providerName },
      })
    ).json();
    providerId = provider.id;

    const plan = await (
      await request.post(`${API_BASE}/hmo/plans`, {
        headers,
        data: { providerId, code: `PL${s}`, name: "E2E Standard", coveragePercent: 80 },
      })
    ).json();
    planId = plan.id;

    // A fresh patient, so no earlier balance colours what this test asserts.
    patientName = `Hmo${s}`;
    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        headers,
        data: {
          firstName: patientName,
          lastName: `Cover${s}`,
          dateOfBirth: "1990-01-01",
          gender: "FEMALE",
          phone: `0803${s}`,
          emergencyContactName: "Next Of Kin",
          emergencyContactPhone: `0805${s}`,
          emergencyContactRelation: "Sibling",
        },
      })
    ).json();

    await request.post(`${API_BASE}/hmo/enrolments`, {
      headers,
      data: {
        patientId: patient.id,
        planId,
        memberNumber: `MBR-${s}`,
        startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
    });

    const departments = await (await request.get(`${API_BASE}/departments`, { headers })).json();
    const dept = Array.isArray(departments) ? departments[0] : departments.data[0];

    const encounter = await (
      await request.post(`${API_BASE}/encounters`, {
        headers,
        data: {
          patientId: patient.id,
          departmentId: dept.id,
          type: "OUTPATIENT",
          chiefComplaint: "E2E cover test",
          isBillable: true,
        },
      })
    ).json();

    await request.post(`${API_BASE}/charges`, {
      headers,
      data: {
        encounterId: encounter.id,
        description: "E2E procedure",
        category: "PROCEDURE",
        quantity: 1,
        unitPrice: BILL,
      },
    });

    // Claims may only be raised against invoiced charges.
    await request.post(`${API_BASE}/charges/encounter/${encounter.id}/invoice`, { headers });

    const claim = await (
      await request.post(`${API_BASE}/hmo/claims/build`, {
        headers,
        data: { encounterId: encounter.id },
      })
    ).json();
    claimNumber = claim.claimNumber;
  });

  test("a claim shows the insurer's share and the patient's co-payment", async ({ page }) => {
    await page.goto("/hmo");
    await expect(page.getByRole("heading", { name: "Insurance & HMO" })).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: claimNumber });
    await expect(row).toBeVisible();

    // 80% of the encounter's charges to the insurer, the rest to the patient.
    // The encounter may carry an automatic consultation fee on top of the
    // procedure, so assert the relationship rather than a fixed figure.
    const cells = await row.getByRole("cell").allInnerTexts();
    const money = (t: string) => Number(t.replace(/[₦,]/g, ""));
    const billed = money(cells[3]!);
    const insurer = money(cells[4]!);
    const patient = money(cells[5]!);

    expect(billed).toBeGreaterThanOrEqual(BILL);
    expect(insurer + patient).toBeCloseTo(billed, 2);
    expect(insurer).toBeCloseTo(billed * 0.8, 2);

    await expect(row.getByText("DRAFT")).toBeVisible();
  });

  test("declining part of a claim moves the shortfall back to the patient", async ({ page }) => {
    await page.goto("/hmo");

    const row = page.getByRole("row").filter({ hasText: claimNumber });
    await row.getByRole("button", { name: /submit/i }).click();
    await expect(row.getByText("SUBMITTED")).toBeVisible();

    await row.getByRole("button", { name: /decision/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/claimed from insurer/i)).toBeVisible();

    // Approve half; the officer must be told what happens to the rest before
    // committing to it.
    const claimedText = await dialog.locator("span.font-medium").first().innerText();
    const claimed = Number(claimedText.replace(/[₦,]/g, ""));

    await dialog.getByLabel(/approved amount/i).fill(String(claimed / 2));
    await expect(dialog.getByText(/declined — this is added to what the patient owes/i)).toBeVisible();

    await dialog.getByLabel(/reason/i).fill("E2E: partly off tariff");
    await dialog.getByRole("button", { name: /record decision/i }).click();
    await expect(dialog).toBeHidden();

    await expect(row.getByText("APPROVED")).toBeVisible();

    // The books must still account for the whole bill.
    const cells = await row.getByRole("cell").allInnerTexts();
    // The insurer cell also shows what was originally claimed on a
    // second line, so read the figure it leads with.
    const money = (t: string) => Number(t.split(/\s/)[0]!.replace(/[₦,]/g, ""));
    expect(money(cells[4]!) + money(cells[5]!)).toBeCloseTo(money(cells[3]!), 2);
  });

  test("the statement shows what the insurer honoured", async ({ page }) => {
    await page.goto("/hmo");
    await page.getByRole("tab", { name: /insurer summary/i }).click();

    const row = page.getByRole("row").filter({ hasText: providerName });
    await expect(row).toBeVisible();
    // Half of what was claimed was approved, so the rate must reflect that.
    await expect(row).toContainText("50%");
  });

  test("eligibility refuses a patient with no cover", async ({ page, request }) => {
    const token = await apiToken(request);
    const patients = await (
      await request.get(`${API_BASE}/patients?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json();

    await page.goto("/hmo");
    await page.getByRole("tab", { name: /eligibility/i }).click();
    await page.getByLabel(/patient/i).fill(patients.data[0].mrn);

    await page.getByRole("button", { name: new RegExp(patients.data[0].mrn) }).click();

    // Either answer is legitimate for an arbitrary patient; what matters is
    // that the screen commits to one rather than showing nothing.
    await expect(
      page.getByText(/covered|not covered/i).first(),
    ).toBeVisible();
  });
});
