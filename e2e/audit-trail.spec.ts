import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * The audit trail was structurally dead: AuditService listened for an
 * "audit.log" event that nothing emitted, so the table, the Audit Trail screen
 * and the AUDITOR role never had a single row. Nothing failed loudly — the
 * screen simply showed an empty list forever. This guards against that
 * returning, and against credentials reaching a seven-year retained table.
 */
test.describe("audit trail", () => {
  test("records who changed what, without storing credentials", async ({ request }) => {
    const token = await apiToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const s = uniqueSuffix();

    const created = await request.post(`${API_BASE}/patients`, {
      headers,
      data: {
        firstName: `Audit${s}`,
        lastName: `Trail${s}`,
        dateOfBirth: "1990-01-01",
        gender: "FEMALE",
        phone: `+23473${s}`,
        emergencyContactName: `Kin ${s}`,
        emergencyContactPhone: `+23472${s}`,
        emergencyContactRelation: "Sister",
      },
    });
    expect(created.ok()).toBeTruthy();
    const patient = await created.json();

    await request.patch(`${API_BASE}/patients/${patient.id}`, {
      headers,
      data: { address: `${s} Marina, Lagos` },
    });

    // The listener writes asynchronously.
    await expect
      .poll(
        async () => {
          const res = await request.get(`${API_BASE}/audit`, {
            headers,
            params: { resource: "patients", limit: 50 },
          });
          if (!res.ok()) return [];
          const body = await res.json();
          return (body.data ?? body.items ?? []).filter(
            (row: any) => row.resourceId === patient.id,
          );
        },
        { timeout: 20_000 },
      )
      .not.toHaveLength(0);

    const res = await request.get(`${API_BASE}/audit`, {
      headers,
      params: { resource: "patients", limit: 50 },
    });
    // NOTE: /audit and /patients page as {items}, while /encounters and
    // /admissions page as {data}. That inconsistency has caused three bugs so
    // far; worth unifying.
    const body = await res.json();
    const rows = (body.items ?? body.data ?? []).filter(
      (r: any) => r.resourceId === patient.id,
    );

    // Both the creation and the amendment are attributable.
    expect(rows.map((r: any) => r.action)).toEqual(
      expect.arrayContaining(["CREATE", "UPDATE"]),
    );
    for (const row of rows) {
      expect(row.userId).toBeTruthy();
      expect(row.ipAddress).toBeTruthy();
    }

    // No credential material anywhere in what was retained.
    const serialised = JSON.stringify(rows);
    for (const secret of ["password", "admin123456", "accessToken", "mfaSecret"]) {
      expect(serialised.toLowerCase()).not.toContain(secret.toLowerCase());
    }
  });
});
