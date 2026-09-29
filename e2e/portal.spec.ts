import { test, expect } from "@playwright/test";
import { apiToken, API_BASE } from "./helpers";

/**
 * The patient portal signs its own token, whose subject is a patient rather
 * than a staff user. Every portal route was guarded by the staff strategy,
 * which looks that id up in the users table — so the portal answered 401 to
 * the very token it had just issued, and the whole patient-facing side was
 * unreachable from the day it was written.
 *
 * The isolation assertions matter as much as the access ones: the two token
 * kinds are signed with the same secret, so only the role keeps them apart.
 */
test.describe("patient portal", () => {
  const PORTAL_ROUTES = [
    "/portal/profile",
    "/portal/appointments",
    "/portal/invoices",
    "/portal/prescriptions",
    "/portal/lab-results",
  ];

  async function patientToken(request: any) {
    const staff = await apiToken(request);
    const patients = await (
      await request.get(`${API_BASE}/patients?limit=1`, {
        headers: { Authorization: `Bearer ${staff}` },
      })
    ).json();
    const patient = patients.data[0];

    const res = await request.post(`${API_BASE}/portal/auth/login`, {
      data: {
        phone: patient.phone,
        dateOfBirth: String(patient.dateOfBirth).slice(0, 10),
      },
    });
    expect(res.ok(), "a patient should be able to sign in to the portal").toBeTruthy();
    return (await res.json()).token as string;
  }

  test("a patient can reach their own record with the token the portal issued", async ({
    request,
  }) => {
    const token = await patientToken(request);

    for (const route of PORTAL_ROUTES) {
      const res = await request.get(`${API_BASE}${route}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status(), `${route} should accept a patient's own token`).toBe(200);
    }
  });

  test("a patient's token opens nothing on the staff side", async ({ request }) => {
    const token = await patientToken(request);

    // Both tokens carry the same signature, so a strategy that only checked
    // the signature would hand a patient the whole hospital.
    for (const route of ["/patients", "/accounting/trial-balance", "/auth/me"]) {
      const res = await request.get(`${API_BASE}${route}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status(), `${route} must refuse a patient token`).toBe(401);
    }
  });

  test("a staff token does not open the portal either", async ({ request }) => {
    const staff = await apiToken(request);

    const res = await request.get(`${API_BASE}/portal/profile`, {
      headers: { Authorization: `Bearer ${staff}` },
    });
    expect(res.status()).toBe(401);
  });
});
