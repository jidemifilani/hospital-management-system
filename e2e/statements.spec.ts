import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * A company on retainership is billed once for a period, not per visit. The
 * thing that must hold is that consolidating does not recognise the money a
 * second time — the receivable already exists from each claim.
 */
test.describe("payer statements", () => {
  let payerName: string;
  let payerId: string;
  let claimTotal = 0;

  test.beforeAll(async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const s = uniqueSuffix();
    payerName = `Acme Industries ${s}`;

    const payer = await (
      await request.post(`${API_BASE}/hmo/providers`, {
        headers,
        data: { code: `CORP${s}`, name: payerName, type: "CORPORATE" },
      })
    ).json();
    payerId = payer.id;

    const plan = await (
      await request.post(`${API_BASE}/hmo/plans`, {
        headers,
        data: { providerId: payerId, code: `ST${s}`, name: "Staff cover", coveragePercent: 100 },
      })
    ).json();

    await request.post(`${API_BASE}/hmo/contracts`, {
      headers,
      data: {
        providerId: payerId,
        contractNumber: `CTR-${s}`,
        startsAt: new Date(Date.now() - 86_400_000).toISOString(),
        paymentTermsDays: 45,
      },
    });

    const departments = await (await request.get(`${API_BASE}/departments`, { headers })).json();
    const list = Array.isArray(departments) ? departments : departments.data;
    const dept = list.find((d: any) => d.consultationServiceItemId) ?? list[0];

    // One employee, one visit, claimed and approved.
    const employee = await (
      await request.post(`${API_BASE}/patients`, {
        headers,
        data: {
          firstName: `Staff${s}`,
          lastName: `Acme${s}`,
          dateOfBirth: "1990-01-01",
          gender: "MALE",
          phone: `0805${s}`,
          emergencyContactName: "Kin",
          emergencyContactPhone: `0806${s}`,
          emergencyContactRelation: "Spouse",
        },
      })
    ).json();

    await request.post(`${API_BASE}/hmo/enrolments`, {
      headers,
      data: {
        patientId: employee.id,
        planId: plan.id,
        memberNumber: `M-${s}`,
        startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
    });

    const encounter = await (
      await request.post(`${API_BASE}/encounters`, {
        headers,
        data: {
          patientId: employee.id,
          departmentId: dept.id,
          type: "OUTPATIENT",
          chiefComplaint: "Staff medical",
          isBillable: true,
        },
      })
    ).json();

    await request.post(`${API_BASE}/charges`, {
      headers,
      data: {
        encounterId: encounter.id,
        description: "Staff medical",
        category: "PROCEDURE",
        quantity: 1,
        unitPrice: 20000,
      },
    });
    await request.post(`${API_BASE}/charges/encounter/${encounter.id}/invoice`, { headers });

    const claim = await (
      await request.post(`${API_BASE}/hmo/claims/build`, {
        headers,
        data: { encounterId: encounter.id },
      })
    ).json();
    claimTotal = Number(claim.coveredAmount);

    await request.post(`${API_BASE}/hmo/claims/${claim.id}/submit`, { headers });
    await request.post(`${API_BASE}/hmo/claims/${claim.id}/adjudicate`, {
      headers,
      data: { approvedAmount: claimTotal },
    });
  });

  test("a company is billed once for the period, and paying it settles the claims", async ({
    page,
    request,
  }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    const arBefore = async () => {
      const tb = await (await request.get(`${API_BASE}/accounting/trial-balance`, { headers })).json();
      const row = tb.rows.find((r: any) => r.code === "1230");
      return Number(row?.debit ?? 0) - Number(row?.credit ?? 0);
    };
    const receivableAtStart = await arBefore();

    await page.goto("/hmo");
    await page.getByRole("tab", { name: /^statements$/i }).click();
    await page.getByRole("button", { name: /build statement/i }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: new RegExp(payerName) }).click();
    await dialog.getByLabel(/period from/i).fill(
      new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
    );
    await dialog.getByLabel(/period to/i).fill(
      new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    );
    await dialog.getByRole("button", { name: /^build$/i }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row").filter({ hasText: payerName });
    await expect(row).toBeVisible();
    await expect(row).toContainText("CORPORATE");
    await expect(row).toContainText("DRAFT");

    // Consolidating must not recognise the debt a second time.
    expect(await arBefore()).toBe(receivableAtStart);

    await row.getByRole("button", { name: /^issue$/i }).click();
    await expect(row.getByText("ISSUED")).toBeVisible();
    expect(await arBefore()).toBe(receivableAtStart);

    await row.getByRole("button", { name: /record payment/i }).click();
    await expect(row.getByText("PAID", { exact: true })).toBeVisible();

    // Paying the statement clears exactly the claims underneath it.
    await expect
      .poll(async () => await arBefore(), { timeout: 15_000, intervals: [300, 600] })
      .toBe(receivableAtStart - claimTotal);
  });
});
