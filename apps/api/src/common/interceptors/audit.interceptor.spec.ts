import { of, lastValueFrom } from "rxjs";
import { AuditInterceptor } from "./audit.interceptor";

/**
 * The audit table is kept for seven years, so whatever reaches it is the
 * longest-lived copy of anything in this system. These cover what must never
 * get in.
 */

function run(req: Record<string, unknown>, responseBody: unknown = { id: "new-1" }) {
  const emitted: any[] = [];
  const events = { emit: (_name: string, payload: unknown) => emitted.push(payload) } as any;

  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
  const handler = { handle: () => of(responseBody) } as any;

  return lastValueFrom(new AuditInterceptor(events).intercept(context, handler)).then(
    () => emitted[0],
  );
}

const patientBody = {
  firstName: "Ada",
  lastName: "Nwosu",
  phone: "08031234567",
  address: "12 Adeola Odeku Street",
  ninNumber: "NIN-98765432101",
  nhisNumber: "NHIS-556677",
  allergies: "Penicillin",
  emergencyContactName: "Chidi Okafor",
  emergencyContactPhone: "08099887766",
};

describe("what the audit trail records about a patient", () => {
  it("does not keep a plaintext copy of anything the database encrypts", async () => {
    const entry = await run({
      method: "POST",
      url: "/api/v1/patients",
      route: { path: "/api/v1/patients" },
      params: {},
      body: patientBody,
      user: { sub: "staff-1", organizationId: "org-1" },
    });

    for (const field of [
      "address",
      "ninNumber",
      "nhisNumber",
      "allergies",
      "emergencyContactName",
      "emergencyContactPhone",
    ]) {
      expect(entry.metadata[field]).toBe("[encrypted]");
    }

    // The whole point is that the value is gone, not merely relabelled.
    expect(JSON.stringify(entry.metadata)).not.toContain("NIN-98765432101");
    expect(JSON.stringify(entry.metadata)).not.toContain("Adeola Odeku");
    expect(JSON.stringify(entry.metadata)).not.toContain("Penicillin");
  });

  it("still records which fields were touched, and by whom", async () => {
    const entry = await run({
      method: "POST",
      url: "/api/v1/patients",
      route: { path: "/api/v1/patients" },
      params: {},
      body: patientBody,
      user: { sub: "staff-1", organizationId: "org-1" },
    });

    // Attribution is what the trail exists for; losing the field names too
    // would leave an entry that says nothing happened.
    expect(Object.keys(entry.metadata)).toEqual(expect.arrayContaining(["address", "ninNumber"]));
    expect(entry.userId).toBe("staff-1");
    expect(entry.action).toBe("CREATE");
    expect(entry.resource).toBe("patients");
  });

  it("leaves the fields patient search needs readable in the trail", async () => {
    const entry = await run({
      method: "POST",
      url: "/api/v1/patients",
      route: { path: "/api/v1/patients" },
      params: {},
      body: patientBody,
      user: { sub: "staff-1", organizationId: "org-1" },
    });

    expect(entry.metadata.firstName).toBe("Ada");
    expect(entry.metadata.phone).toBe("08031234567");
  });

  it("still keeps credentials out", async () => {
    const entry = await run({
      method: "PATCH",
      url: "/api/v1/users/u-1",
      route: { path: "/api/v1/users/:id" },
      params: { id: "u-1" },
      body: { email: "a@b.ng", newPassword: "hunter2" },
      user: { sub: "staff-1", organizationId: "org-1" },
    });

    expect(entry.metadata.newPassword).toBe("[redacted]");
    expect(JSON.stringify(entry.metadata)).not.toContain("hunter2");
  });
});
