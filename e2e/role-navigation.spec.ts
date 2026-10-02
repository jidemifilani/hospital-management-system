import { test, expect, type Page } from "@playwright/test";
import { API_BASE, DOCTOR, login } from "./helpers";

/**
 * The sidebar used to list all fifty-four screens to everyone, so a role
 * without a permission found out by clicking a link and reading an error.
 *
 * What matters is that the menu and the API agree, in both directions. A unit
 * test checks that the permissions the sidebar asks for are the ones the
 * controllers require; this checks the part that test cannot see — that the
 * filtering reaches the rendered page, and that something hidden is genuinely
 * refused rather than merely tidied away.
 */

// Its own session rather than the admin state the rest of the suite shares:
// the admin roles bypass permission checks entirely, so they can prove nothing
// about filtering.
test.use({ storageState: { cookies: [], origins: [] } });

// One sign-in for the whole file, shared across the tests below. Signing in
// per test meant six sign-ins, and each one is a cold navigation on a dev
// server that compiles routes on first request — six chances to time out
// proving nothing about permissions.
test.describe.configure({ mode: "serial" });

test.describe("what a role is offered", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page, DOCTOR);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("a doctor is offered the work a doctor does", async () => {
    const sidebar = page.locator("aside");

    for (const label of [
      "Patients",
      "Encounters",
      "Laboratory",
      "Ward Rounds",
      "Discharge",
      "Consent",
    ]) {
      await expect(sidebar.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("and not the things it has no business with", async () => {
    const sidebar = page.locator("aside");

    // Clicking any of these returned "Insufficient permissions".
    for (const label of ["Payroll", "Users & Roles", "Audit Trail", "Point of Sale"]) {
      await expect(sidebar.getByRole("link", { name: label, exact: true })).toHaveCount(0);
    }
  });

  test("the sidebar is filtered, not emptied", async () => {
    const count = await page.locator("aside").getByRole("link").count();

    // Checked because the two tests above both pass when the sidebar is empty,
    // which is how a filter that hides everything looks from here. It did
    // exactly that once, when a stale build of the shared permission package
    // shadowed the real one and the component threw.
    expect(count).toBeGreaterThan(20);
    expect(count).toBeLessThan(54);
  });

  test("every link it does offer actually opens", async () => {
    const hrefs = await page
      .locator("aside")
      .getByRole("link")
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute("href")).filter(Boolean),
      );

    // A sample rather than all 39: this dev server compiles each route on
    // first request, and visiting every one takes longer than the test budget
    // from cold. The unit test covers the whole list by comparing it against
    // the controllers.
    for (const href of hrefs.slice(0, 3)) {
      const response = await page.goto(href!);
      expect(response?.status(), `${href} should load for a doctor`).toBeLessThan(400);
      await expect(page.getByText(/insufficient permissions/i)).toHaveCount(0);
    }
  });

  test("a screen it is not offered is refused by the API, not just hidden", async () => {
    // Hiding a link is not a control — it decides what to offer. What matters
    // is what happens when someone types the address, and that is the guard's
    // answer rather than the menu's. The page shell may still render; no data
    // reaches it.
    const session = await page.request.get("/api/auth/session").then((r) => r.json());
    const token = session?.user?.accessToken;
    expect(token, "the session should carry an API token").toBeTruthy();

    const refused = await page.request.get(`${API_BASE}/payroll`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(refused.status()).toBe(403);

    // The same request for something it is offered goes through, so the 403
    // above is the permission check and not a broken request.
    const allowed = await page.request.get(`${API_BASE}/patients`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(allowed.status()).toBe(200);
  });
});
