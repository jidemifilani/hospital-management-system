import * as fs from "node:fs";
import * as path from "node:path";
import { PERMISSIONS, ROLE_PERMISSIONS, hasPermission } from "@hms/config";

/**
 * Keeps the sidebar honest about what the API will actually allow.
 *
 * The navigation decides which links to offer and the guard decides which
 * requests to accept. They are two answers to one question, and when they
 * disagree it goes wrong in both directions: a link that answers 403 when
 * clicked, or — quietly, and worse — a feature somebody is entitled to use
 * that nothing ever offers them. Nobody reports the second kind.
 *
 * So this reads both sides from source and insists they agree. It parses
 * rather than imports because the sidebar is a .tsx full of icon components
 * that will not load in this environment, and because parsing is what notices
 * a nav item added without a permission at all.
 */

const REPO = path.resolve(__dirname, "../../../../..");
const SIDEBAR = path.join(REPO, "apps/web/src/components/layout/sidebar.tsx");
const API_SRC = path.join(REPO, "apps/api/src");

/**
 * Nav hrefs whose page is served by a controller that is not named after it.
 *
 * Each one is a decision rather than an oversight, so it is written down here
 * instead of the test quietly skipping what it cannot resolve.
 */
const SERVED_BY: Record<string, string> = {
  "/recalls": "recalls",
  "/opd-queue": "opd-queue",
  "/blood-bank": "blood-bank",
  "/care-plans": "care-plans",
  "/ward-rounds": "ward-rounds",
  // Reads the dashboard's own reporting endpoint rather than a reports module.
  "/reports": "dashboard",
  // The beds board is part of admissions.
  "/beds": "beds",
  // Finished goods are stock, counted by the inventory module.
  "/production": "production",
  "/admin/users": "users",
  "/admin/audit": "audit",
  "/admin/catalogue": "catalogue",
  "/admin/site-settings": "site-settings",
  // The one link outside the groups, checked separately in the component.
  "/settings": "settings",
};

type NavItem = { href: string; permission: string };

function readNavItems(): NavItem[] {
  const source = fs.readFileSync(SIDEBAR, "utf8");
  const items = [...source.matchAll(/\{\s*href: "([^"]+)"[^}]*?\}/g)].map((m) => m[0]);

  return items.map((raw) => {
    const href = /href: "([^"]+)"/.exec(raw)![1]!;
    const permission = /permission: PERMISSIONS\.([A-Z_]+)/.exec(raw)?.[1];
    return { href, permission: permission ?? "" };
  });
}

/** Every permission each controller requires, keyed by its route prefix. */
function readControllerPermissions(): Map<string, Set<string>> {
  const files: string[] = [];
  (function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".controller.ts")) files.push(full);
    }
  })(API_SRC);

  const byRoute = new Map<string, Set<string>>();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const route = /@Controller\(["']([^"']*)["']\)/.exec(source)?.[1];
    if (route === undefined) continue;

    const required = new Set(
      [...source.matchAll(/@RequirePermissions\(([^)]*)\)/g)].flatMap((m) =>
        [...m[1]!.matchAll(/PERMISSIONS\.([A-Z_]+)/g)].map((p) => p[1]!),
      ),
    );
    byRoute.set(route, required);
  }
  return byRoute;
}

const navItems = readNavItems();
const controllers = readControllerPermissions();

describe("the navigation", () => {
  it("was found, and has the items the app actually ships", () => {
    // A parse that silently matched nothing would make every test below pass
    // while checking nothing at all.
    expect(navItems.length).toBeGreaterThan(40);
  });

  it("declares a permission for every link", () => {
    const undeclared = navItems.filter((n) => !n.permission).map((n) => n.href);

    // A link with no permission is shown to everyone, which is the behaviour
    // this whole arrangement replaced.
    expect(undeclared).toEqual([]);
  });

  it("only uses permissions that exist", () => {
    const known = new Set(Object.keys(PERMISSIONS));
    const invented = navItems.filter((n) => !known.has(n.permission));

    // A typo here hides the link from everyone except the admin roles, which
    // bypass the check — so it would look fine to whoever tested it.
    expect(invented.map((n) => `${n.href} -> ${n.permission}`)).toEqual([]);
  });
});

describe("the navigation and the API agree", () => {
  it("asks for a permission the page's own controller requires", () => {
    const disagreements: string[] = [];

    for (const { href, permission } of navItems) {
      const route = SERVED_BY[href] ?? href.replace(/^\//, "");
      const required = controllers.get(route);

      if (!required) {
        disagreements.push(`${href}: no controller found for route "${route}"`);
        continue;
      }
      if (required.size === 0) {
        disagreements.push(`${href}: controller "${route}" requires no permissions at all`);
        continue;
      }
      if (!required.has(permission)) {
        disagreements.push(
          `${href}: sidebar asks for ${permission}, but "${route}" requires ` +
            `${[...required].join(", ")}`,
        );
      }
    }

    expect(disagreements).toEqual([]);
  });
});

describe("what each role is offered", () => {
  /**
   * The source gives the constant's name; the grants hold its value.
   *
   * Worth spelling out, because getting this wrong is invisible in the obvious
   * test: comparing "DASHBOARD_VIEW" against a list of "dashboard:view" finds
   * nothing, and the admin roles still pass because they never look. Which is
   * what this suite did on its first run.
   */
  const valueOf = (key: string) => PERMISSIONS[key as keyof typeof PERMISSIONS];

  const visibleTo = (role: string) =>
    navItems.filter((n) => hasPermission(role, valueOf(n.permission))).map((n) => n.href);

  it("gives the admin roles everything, since they bypass the check", () => {
    for (const role of ["SUPER_ADMIN", "HOSPITAL_ADMIN"]) {
      expect(visibleTo(role)).toHaveLength(navItems.length);
    }
  });

  it("gives a cashier the till and the bills, and not the payroll", () => {
    const cashier = visibleTo("CASHIER");

    expect(cashier).toEqual(expect.arrayContaining(["/billing", "/pos"]));
    expect(cashier).not.toEqual(expect.arrayContaining(["/payroll", "/admin/audit", "/lab"]));
  });

  it("gives a lab technologist the laboratory, and not the ward", () => {
    const lab = visibleTo("LAB_TECHNOLOGIST");

    expect(lab).toContain("/lab");
    expect(lab).not.toContain("/payroll");
    expect(lab).not.toContain("/admin/users");
  });

  it("leaves every role something to do", () => {
    // A role that signs in to an empty sidebar cannot work, and the first
    // person to find out would be whoever holds that job.
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(visibleTo(role).length).toBeGreaterThan(0);
    }
  });

  it("offers the dashboard to everyone who can open the app", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(visibleTo(role)).toContain("/dashboard");
    }
  });

  it("shows nobody without a role anything", () => {
    expect(navItems.filter((n) => hasPermission(undefined, valueOf(n.permission)))).toEqual([]);
    expect(navItems.filter((n) => hasPermission("", valueOf(n.permission)))).toEqual([]);
  });

  /**
   * The screens each job cannot do without.
   *
   * Nothing in the configuration can tell you that a doctor needs discharge or
   * that a cashier needs a till — that is knowledge about the hospital, not
   * about the code, and when it lived only in people's heads a doctor went
   * without ward rounds, consent and discharge for as long as the sidebar
   * showed everything to everyone and hid the omission.
   *
   * So it is written down here. The list is deliberately short: the few things
   * that, if the holder of that job could not reach them, would mean the role
   * is broken rather than merely narrow. Adding to it is how you record a
   * decision about what a job needs.
   */
  const MUST_BE_ABLE_TO_REACH: Record<string, string[]> = {
    DOCTOR: [
      "/patients",
      "/encounters",
      "/admissions",
      "/lab",
      "/pharmacy",
      // The three a doctor was missing.
      "/ward-rounds",
      "/consent",
      "/discharge",
    ],
    NURSE: [
      "/patients",
      "/encounters",
      "/admissions",
      "/mar",
      "/triage",
      "/handover",
      "/ward-rounds",
    ],
    RECEPTIONIST: ["/patients", "/appointments", "/opd-queue", "/visitors"],
    // The till: only the admin roles could open one.
    CASHIER: ["/patients", "/billing", "/pos"],
    LAB_TECHNOLOGIST: ["/patients", "/lab"],
    RADIOLOGIST: ["/patients", "/radiology"],
    PHARMACIST: ["/patients", "/pharmacy"],
    HR_OFFICER: ["/staff", "/payroll", "/roster", "/leave", "/attendance", "/appraisals"],
    AUDITOR: ["/admin/audit", "/documents"],
    DEPARTMENT_HEAD: ["/staff", "/patients", "/appointments"],
  };

  it("lets every job reach the screens that job needs", () => {
    const missing: string[] = [];

    for (const [role, required] of Object.entries(MUST_BE_ABLE_TO_REACH)) {
      const offered = visibleTo(role);
      for (const href of required) {
        if (!offered.includes(href)) missing.push(`${role} cannot reach ${href}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it("expects something of every role that is not an administrator", () => {
    // A role added to the system with nothing expected of it here would be
    // checked by none of the above, which is how this stops being a guard.
    const unlisted = Object.keys(ROLE_PERMISSIONS)
      .filter((role) => !["SUPER_ADMIN", "HOSPITAL_ADMIN"].includes(role))
      .filter((role) => !MUST_BE_ABLE_TO_REACH[role]);

    expect(unlisted).toEqual([]);
  });

  it("would notice if the key-to-value lookup broke", () => {
    // Guards the subtlety above: if valueOf stopped resolving, every non-admin
    // role would silently see an empty sidebar and most tests here would still
    // pass on the admin roles alone.
    expect(valueOf("DASHBOARD_VIEW")).toBe("dashboard:view");
    expect(ROLE_PERMISSIONS.CASHIER).toContain(valueOf("BILLING_READ"));
  });
});
