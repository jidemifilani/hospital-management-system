import { test, expect } from "@playwright/test";
import { apiToken, API_BASE, uniqueSuffix } from "./helpers";

/**
 * A desk is only useful if it is honest about what is late and who has been
 * left waiting. These drive the two things that decide both: whether a reply
 * actually reached the person who raised the ticket, and what happens when
 * something closed turns out not to be fixed.
 */
test.describe("helpdesk", () => {
  test("raising a ticket routes it and sets a target from the priority", async ({ page }) => {
    const s = uniqueSuffix();
    const title = `Ventilator alarming ${s}`;

    await page.goto("/helpdesk");
    await expect(page.getByRole("heading", { name: "Helpdesk" })).toBeVisible();

    await page.getByRole("button", { name: /raise ticket/i }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel(/what is wrong/i).fill(title);
    await dialog.getByLabel(/details/i).fill("Bed 4 ventilator alarms continuously");
    await dialog.getByLabel(/where/i).fill("ICU bed 4");

    // Category drives the team, priority drives the target — the dialog says
    // what the target will be before it is raised.
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Medical equipment" }).click();
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: "Urgent", exact: true }).click();
    await expect(dialog.getByText(/fixed within 4 hours/i)).toBeVisible();

    await dialog.getByRole("button", { name: /raise ticket/i }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row").filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Biomedical");
    await expect(row).toContainText("Urgent");
  });

  test("an internal note does not count as replying to the requester", async ({ page, request }) => {
    const token = await apiToken(request);
    const s = uniqueSuffix();
    const title = `Blocked drain ${s}`;

    // Raised by someone other than whoever will reply, so the response clock
    // is meaningful.
    await request.post(`${API_BASE}/helpdesk`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title,
        description: "Sluice room drain blocked",
        category: "PLUMBING",
        location: `Ward ${s}`,
        priority: "HIGH",
      },
    });

    await page.goto("/helpdesk");
    await page.getByRole("row").filter({ hasText: title }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/nobody has replied to this yet/i)).toBeVisible();

    // Named exactly: the internal-note checkbox's own label also contains
    // "replying", so a loose /reply/i matches two controls.
    await dialog.getByRole("textbox", { name: "Reply" }).fill("Checking who is on call");
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: /^add$/i }).click();

    await expect(dialog.getByText(/internal/i).first()).toBeVisible();
    // Still unanswered as far as the person waiting is concerned.
    await expect(dialog.getByText(/nobody has replied to this yet/i)).toBeVisible();
  });

  test("resolving needs an account of what was done, and reopening restarts the clock", async ({
    page,
    request,
  }) => {
    const token = await apiToken(request);
    const s = uniqueSuffix();
    const title = `Lift stuck ${s}`;

    await request.post(`${API_BASE}/helpdesk`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title,
        description: "Service lift stuck between floors",
        category: "ELECTRICAL",
        location: `Lift ${s}`,
        priority: "URGENT",
      },
    });

    await page.goto("/helpdesk");
    await page.getByRole("row").filter({ hasText: title }).click();
    const dialog = page.getByRole("dialog");

    // Nothing to press until there is something to say.
    await expect(dialog.getByRole("button", { name: /mark resolved/i })).toBeDisabled();

    await dialog.getByLabel(/resolution/i).fill("Reset the drive and freed the doors");
    await dialog.getByRole("button", { name: /mark resolved/i }).click();
    await expect(dialog.getByText("Resolved").first()).toBeVisible();

    // A ticket that comes back was not resolved, and the count says so.
    await dialog.getByLabel(/not actually fixed/i).fill("Stuck again within the hour");
    await dialog.getByRole("button", { name: /reopen/i }).click();

    await expect(dialog.getByText(/reopened 1×/i)).toBeVisible();
    await expect(dialog.getByText(/stuck again within the hour/i)).toBeVisible();
    // Reopened tickets get a fresh target rather than an already-missed one.
    await expect(dialog.getByText(/past its target/i)).toHaveCount(0);
  });
});
