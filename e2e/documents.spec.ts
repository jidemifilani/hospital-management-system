import { test, expect } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

/**
 * Documents attached to a patient are protected health information, so what
 * matters here is that a real file survives the round trip unchanged and that
 * removing one hides it rather than destroying it.
 */
test.describe("documents", () => {
  const PDF = Buffer.from("%PDF-1.4\n% e2e document round trip\n%%EOF\n");

  test("uploads a file, downloads it back unchanged, and removes it with a reason", async ({ page }) => {
    const s = uniqueSuffix();
    const title = `E2E Consent ${s}`;

    await page.goto("/documents");
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();

    await page.getByRole("button", { name: /upload document/i }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel(/^file/i).setInputFiles({
      name: `consent-${s}.pdf`,
      mimeType: "application/pdf",
      buffer: PDF,
    });
    await dialog.getByLabel(/title/i).fill(title);
    await dialog.getByRole("button", { name: /^upload$/i }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row").filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row).toContainText(`consent-${s}.pdf`);

    // The bytes that come back must be the bytes that went in; a document
    // store that quietly corrupts a scan is worse than one that refuses it.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      row.getByRole("button", { name: "Download" }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).equals(PDF)).toBe(true);

    // Removing must state a reason, and must hide rather than destroy.
    await row.getByRole("button", { name: "Remove" }).click();
    const removeDialog = page.getByRole("dialog").filter({ hasText: /remove document/i });
    await expect(removeDialog.getByRole("button", { name: /^remove$/i })).toBeDisabled();

    await removeDialog.getByLabel(/reason/i).fill("E2E: filed in error");
    await removeDialog.getByRole("button", { name: /^remove$/i }).click();
    await expect(removeDialog).toBeHidden();

    await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
  });

  test("refuses a file type a hospital has no reason to store", async ({ page }) => {
    const s = uniqueSuffix();

    await page.goto("/documents");
    await page.getByRole("button", { name: /upload document/i }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel(/^file/i).setInputFiles({
      name: `tool-${s}.exe`,
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("MZ\x90\x00"),
    });
    await dialog.getByLabel(/title/i).fill(`Rejected ${s}`);
    await dialog.getByRole("button", { name: /^upload$/i }).click();

    // The server decides, and the reason has to reach the person uploading.
    await expect(page.getByText(/cannot be stored/i)).toBeVisible();
  });

  test("keeps the old file when a document is replaced", async ({ page }) => {
    const s = uniqueSuffix();
    const title = `E2E Versioned ${s}`;

    await page.goto("/documents");
    await page.getByRole("button", { name: /upload document/i }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^file/i).setInputFiles({
      name: `v1-${s}.pdf`, mimeType: "application/pdf", buffer: PDF,
    });
    await dialog.getByLabel(/title/i).fill(title);
    await dialog.getByRole("button", { name: /^upload$/i }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row").filter({ hasText: title });
    await row.getByRole("button", { name: /replace with a new version/i }).click();

    dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/the old file is kept, not overwritten/i)).toBeVisible();
    await dialog.getByLabel(/^file/i).setInputFiles({
      name: `v2-${s}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% second version\n%%EOF\n"),
    });
    await dialog.getByRole("button", { name: /^upload$/i }).click();
    await expect(dialog).toBeHidden();

    // The list shows only what is current, so the v1 row must be gone and the
    // replacement must be marked as v2.
    const v2Row = page.getByRole("row").filter({ hasText: `${title} (new version)` });
    await expect(v2Row).toBeVisible();
    await expect(v2Row).toContainText("v2");

    await v2Row.getByRole("button", { name: /version history/i }).click();
    const history = page.getByRole("dialog").filter({ hasText: /version history/i });
    // Both versions remain retrievable.
    await expect(history.getByRole("row")).toHaveCount(3); // header + 2 versions
    await expect(history.getByText("current")).toBeVisible();
  });
});
