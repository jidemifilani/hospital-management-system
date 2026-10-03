import * as fs from "node:fs";
import * as path from "node:path";
import { PERMISSIONS, ROLE_PERMISSIONS, UNRESTRICTED_ROLES } from "@hms/config";

/**
 * Checks the role definitions against themselves and against the API.
 *
 * Three role definitions turned out to be wrong, and all three were found by
 * accident — a cashier who could not open a till, a doctor with no discharge,
 * and six roles with no access to the page sign-in sends them to. None of them
 * was a typo; each was a list of a hundred-odd permissions maintained by hand
 * with nothing checking it. Patching the three would have left whatever is
 * next, so these are the invariants that would have caught them.
 *
 * Where something looks wrong but is deliberate it is written into one of the
 * lists below with a reason, and the test fails if anything new joins it
 * quietly. That is the point of the lists: they are the record of what was
 * decided, not an exemption from thinking.
 */

const REPO = path.resolve(__dirname, "../../../../..");
const API_SRC = path.join(REPO, "apps/api/src");

const ADMIN_ROLES: readonly string[] = UNRESTRICTED_ROLES;
const ordinaryRoles = Object.keys(ROLE_PERMISSIONS).filter((r) => !ADMIN_ROLES.includes(r));

/**
 * Permissions only the admin roles are meant to hold.
 *
 * Everything else must be reachable by somebody who actually does the job,
 * because a permission no ordinary role holds is a feature only an
 * administrator can use — which is how the point of sale ended up unusable by
 * cashiers.
 */
const DELIBERATELY_ADMIN_ONLY: Record<string, string> = {
  "admin:config": "hospital configuration: departments, site settings, job runner",
  "admin:users": "creating and changing user accounts",
  "admin:roles": "changing what a role may do",
  "patients:delete": "removing a patient record, as opposed to marking it inactive",
  "pos:refund": "reversing a payment, which wants a second pair of eyes",
  "settings:manage": "adding and removing beds, and system settings",
  // Open questions rather than settled policy — see the note at the end of
  // this file. Listed so the suite passes on today's behaviour while the
  // decision is outstanding, not because admin-only is known to be right.
  "accounting:read": "UNDECIDED: should an auditor be able to read the ledger?",
  "accounting:manage": "posting to the ledger",
  "inventory:read": "UNDECIDED: should a pharmacist be able to see drug stock?",
  "inventory:manage": "receiving and adjusting stock",
};

/**
 * Permissions that exist and are granted but which nothing checks.
 *
 * A permission nothing enforces describes a control that is not there. These
 * four read as though cancelling an appointment, amending a bill, creating a
 * member of staff and editing a role were each gated, and none of them is.
 * Their holders are exactly who you would expect — a receptionist cancels, a
 * cashier amends, HR hires — so the intent was there and the endpoints simply
 * never asked. Enforcing them narrows who can do each of those things, which
 * is a decision about how the hospital runs rather than a defect to patch
 * quietly.
 */
const NOT_ENFORCED_ANYWHERE: Record<string, string> = {
  "appointments:cancel": "cancelling goes through the status endpoint, gated on appointments:update",
  "billing:update": "invoice edits are gated on billing:create",
  "staff:create": "creating staff is gated on staff:update",
  "admin:roles": "there is no endpoint for editing a role; the lists are code",
};

/** Every PERMISSIONS.X referenced anywhere in the API, by decorator or by hand. */
function referencedPermissions(): Map<string, Set<string>> {
  const files: string[] = [];
  (function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".ts") && !entry.endsWith(".spec.ts")) files.push(full);
    }
  })(API_SRC);

  const used = new Map<string, Set<string>>();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/PERMISSIONS\.([A-Z_]+)/g)) {
      const key = match[1]!;
      if (!used.has(key)) used.set(key, new Set());
      used.get(key)!.add(path.relative(API_SRC, file));
    }
  }
  return used;
}

const referenced = referencedPermissions();
const valueOf = (key: string) => PERMISSIONS[key as keyof typeof PERMISSIONS];

describe("the permission vocabulary", () => {
  it("was read, and found something to check", () => {
    // A scan that matched nothing would make everything below pass vacuously.
    expect(referenced.size).toBeGreaterThan(50);
  });

  it("is only referenced by names that exist", () => {
    const invented = [...referenced.keys()].filter((key) => !valueOf(key));

    // A misspelt permission in a decorator can never be satisfied, so that
    // endpoint is refused to every role except the admins who skip the check —
    // and it looks fine to whoever tested it as an admin.
    expect(invented).toEqual([]);
  });

  it("has nothing granted that no role holds", () => {
    const held = new Set(Object.values(ROLE_PERMISSIONS).flat());
    const unheld = Object.values(PERMISSIONS).filter((p) => !held.has(p));

    expect(unheld).toEqual([]);
  });

  it("enforces everything it declares, or says why not", () => {
    const unenforced = Object.entries(PERMISSIONS)
      .filter(([key]) => !referenced.has(key))
      .map(([, value]) => value)
      .filter((value) => !(value in NOT_ENFORCED_ANYWHERE));

    // Anything arriving here is a permission that reads like a control and is
    // not one. Either enforce it, or add it above with the reason.
    expect(unenforced).toEqual([]);
  });

  it("does not let the declared exceptions go stale", () => {
    // If one of these starts being enforced, the note above is now wrong and
    // should go, rather than sitting there claiming otherwise.
    const nowEnforced = Object.keys(NOT_ENFORCED_ANYWHERE).filter((value) => {
      const key = Object.keys(PERMISSIONS).find((k) => valueOf(k) === value);
      return key ? referenced.has(key) : false;
    });

    expect(nowEnforced).toEqual([]);
  });
});

describe("every endpoint is reachable by somebody who does the job", () => {
  it("has no permission that only an administrator holds, unless that is the intent", () => {
    const adminOnly: string[] = [];

    for (const key of referenced.keys()) {
      const value = valueOf(key);
      if (!value || value in DELIBERATELY_ADMIN_ONLY) continue;
      if (!ordinaryRoles.some((role) => ROLE_PERMISSIONS[role]!.includes(value))) {
        adminOnly.push(`${value} (required in ${[...referenced.get(key)!].slice(0, 2).join(", ")})`);
      }
    }

    // This is the check that would have caught the point of sale: pos:read was
    // required by the controller and held by nobody who works a till.
    expect(adminOnly).toEqual([]);
  });

  it("does not let the admin-only list go stale either", () => {
    const nowShared = Object.keys(DELIBERATELY_ADMIN_ONLY).filter((value) =>
      ordinaryRoles.some((role) => ROLE_PERMISSIONS[role]!.includes(value)),
    );

    // A permission given to an ordinary role is no longer admin-only, so the
    // entry above is stale and its reason is no longer true.
    expect(nowShared).toEqual([]);
  });
});

describe("each role hangs together", () => {
  it("can reach the page sign-in sends it to", () => {
    const stranded = Object.keys(ROLE_PERMISSIONS).filter(
      (role) => !ROLE_PERMISSIONS[role]!.includes(PERMISSIONS.DASHBOARD_VIEW),
    );

    // Sign-in pushes every role to /dashboard unconditionally. Six of the
    // twelve could not read it, so they arrived somewhere every call was
    // refused.
    expect(stranded).toEqual([]);
  });

  it("can read whatever it can change", () => {
    const incoherent: string[] = [];

    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      const held = ROLE_PERMISSIONS[role]!;
      for (const key of Object.keys(PERMISSIONS)) {
        if (!key.endsWith("_MANAGE")) continue;
        const read = valueOf(key.replace(/_MANAGE$/, "_READ"));
        if (!read) continue;
        if (held.includes(valueOf(key)) && !held.includes(read)) {
          incoherent.push(`${role} may ${valueOf(key)} but not ${read}`);
        }
      }
    }

    // Writing to something you cannot list is not a role, it is a mistake:
    // every one of these screens loads a list before it offers to change it.
    expect(incoherent).toEqual([]);
  });

  it("gives the admin roles the whole vocabulary", () => {
    // They bypass the check, so their lists do not gate anything — but code
    // that asks "does this role hold X" rather than going through
    // hasPermission relies on the list being complete, and a new permission
    // not added here would quietly exclude them.
    for (const role of ADMIN_ROLES) {
      const missing = Object.values(PERMISSIONS).filter(
        (p) => !ROLE_PERMISSIONS[role]!.includes(p),
      );
      expect(missing).toEqual([]);
    }
  });
});
