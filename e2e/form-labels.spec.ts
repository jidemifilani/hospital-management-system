import { test, expect } from "@playwright/test";
import { assertDistinctFieldNames } from "./helpers";

/**
 * Guards against the mistake that has bitten this suite twice: a field whose
 * label swallows another field's, so a lookup for the shorter one matches
 * both. Each failure so far was found only when a test happened to run that
 * line, and was fixed by making the locator narrower — which leaves the form
 * itself confusing and the next collision waiting.
 *
 * This checks the forms directly. A field named "Internal note — not shown to
 * whoever raised this, and does not count as replying to them", sitting beside
 * a field named "Reply", fails here whether or not any test looks for it.
 */

interface Dialog {
  name: string;
  path: string;
  open: string;
}

const DIALOGS: Dialog[] = [
  { name: "Helpdesk · raise a ticket", path: "/helpdesk", open: "Raise Ticket" },
  { name: "Documents · upload", path: "/documents", open: "Upload Document" },
  { name: "Inventory · receive stock", path: "/inventory", open: "Receive Stock" },
  { name: "Inventory · stock count", path: "/inventory", open: "Stock Count" },
  { name: "Inventory · add item", path: "/inventory", open: "Add Item" },
  { name: "Insurance · add insurer", path: "/hmo", open: "Add Insurer" },
  { name: "Insurance · add plan", path: "/hmo", open: "Add Plan" },
  { name: "Insurance · enrol patient", path: "/hmo", open: "Enrol Patient" },
  // Screens that predate this work, included because the mistake is not
  // specific to the forms I wrote.
  { name: "Departments · new department", path: "/departments", open: "New Department" },
  { name: "Incidents · report incident", path: "/incidents", open: "Report Incident" },
  { name: "Leave · apply for leave", path: "/leave", open: "Apply for Leave" },
];

test.describe("form fields can be told apart", () => {
  for (const dialog of DIALOGS) {
    test(`${dialog.name}`, async ({ page }) => {
      await page.goto(dialog.path);
      await page.getByRole("button", { name: dialog.open, exact: true }).first().click();

      const form = page.getByRole("dialog");
      await expect(form).toBeVisible();

      await assertDistinctFieldNames(form, dialog.name);
    });
  }

  test("a helpdesk ticket's reply box is not confused with the internal-note box", async ({
    page,
  }) => {
    await page.goto("/helpdesk");

    const anyTicket = page.getByRole("row").nth(1);
    await expect(anyTicket).toBeVisible();
    await anyTicket.click();

    const detail = page.getByRole("dialog");
    await expect(detail).toBeVisible();
    // The dialog shows a spinner until the ticket loads; checking before its
    // fields exist would approve an empty form.
    await expect(detail.getByRole("textbox", { name: "Reply" })).toBeVisible();

    // The exact pairing that broke: a long explanatory label on the checkbox
    // made a plain "reply" lookup resolve to two controls.
    await assertDistinctFieldNames(detail, "Helpdesk · ticket detail");
    await expect(detail.getByLabel(/reply/i)).toHaveCount(1);
  });
});
