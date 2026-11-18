import { test, expect } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

/**
 * The report builder, through the screen.
 *
 * The service has unit tests and the SQL it writes was checked against a real
 * database, but neither says whether a person can actually assemble a report —
 * which is the entire point of the feature: an answer without a developer.
 */
test.describe("report builder", () => {
  /** Opens a shadcn Select by its test id and picks an option by name. */
  async function choose(page: import("@playwright/test").Page, testId: string, option: string) {
    await page.getByTestId(testId).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  }

  test("builds a report from nothing and shows the answer", async ({ page }) => {
    await page.goto("/report-builder");

    await choose(page, "source-select", "Encounters");

    await page.getByRole("button", { name: /add grouping/i }).click();
    await choose(page, "dimension-field-0", "Type");

    // Count is the default measure, so this is already a runnable report.
    await page.getByRole("button", { name: "Run", exact: true }).click();

    const result = page.getByTestId("report-result");
    await expect(result).toBeVisible();
    await expect(result.getByRole("columnheader", { name: "Type" })).toBeVisible();
    await expect(result.getByRole("columnheader", { name: "Count" })).toBeVisible();

    // The seeded data has encounters, so there is a row and its count is a
    // number rather than the placeholder for nothing.
    const firstCount = result.getByRole("row").nth(1).getByRole("cell").last();
    await expect(firstCount).not.toBeEmpty();
    await expect(firstCount).not.toHaveText("—");
  });

  test("groups a date by month rather than by the instant", async ({ page }) => {
    await page.goto("/report-builder");

    await choose(page, "source-select", "Invoices");
    await page.getByRole("button", { name: /add grouping/i }).click();
    await choose(page, "dimension-field-0", "Raised on");
    await choose(page, "dimension-bucket-0", "by month");

    await page.getByRole("button", { name: "Run", exact: true }).click();

    const result = page.getByTestId("report-result");
    await expect(result.getByRole("columnheader", { name: /Raised on \(month\)/ })).toBeVisible();

    // A bucketed date renders as a date, not a timestamp.
    const firstCell = result.getByRole("row").nth(1).getByRole("cell").first();
    await expect(firstCell).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("saves a report and runs it again from the saved list", async ({ page }) => {
    const name = `Encounters by status ${uniqueSuffix()}`;

    await page.goto("/report-builder");

    await choose(page, "source-select", "Encounters");
    await page.getByRole("button", { name: /add grouping/i }).click();
    await choose(page, "dimension-field-0", "Status");

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByTestId("confirm-save").click();

    await page.getByRole("tab", { name: /saved reports/i }).click();
    await expect(page.getByTestId(`saved-report-${name}`)).toBeVisible();

    await page.getByRole("button", { name: `Run ${name}` }).click();

    const result = page.getByTestId("report-result");
    await expect(result.getByRole("columnheader", { name: "Status" })).toBeVisible();
    // Running it from the list names the report it came from.
    await expect(result.getByText(name)).toBeVisible();

    // Tidy up, so a second run of this suite does not trip the unique name.
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(page.getByTestId(`saved-report-${name}`)).toBeHidden();
  });

  test("will not let the last measure be removed", async ({ page }) => {
    // A report with no measure and no grouping asks for nothing, and the API
    // refuses it. The screen does not offer the chance: the remove button is
    // disabled while one measure is left, so the request is never made.
    await page.goto("/report-builder");

    await choose(page, "source-select", "Patients");
    await expect(page.getByTestId("measure-remove-0")).toBeDisabled();

    await page.getByRole("button", { name: /add measure/i }).click();
    await expect(page.getByTestId("measure-remove-0")).toBeEnabled();

    await page.getByTestId("measure-remove-1").click();
    await expect(page.getByTestId("measure-remove-0")).toBeDisabled();
  });
});
