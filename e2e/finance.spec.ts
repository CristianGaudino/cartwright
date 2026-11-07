import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// A keystroke before React attaches does nothing.
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const result = (page: Page) => page.getByRole("status");

test("/finance works out a placeholder representative payment as the buyer types", async ({ page }) => {
  await open(page, "/finance");
  await expect(page.getByRole("heading", { level: 1, name: "Finance" })).toBeVisible();
  await expect(page.getByText("Placeholder figures")).toBeVisible();
  await expect(page.getByText("Representative only. Not an offer of credit.")).toBeVisible();
  await expect(result(page)).toContainText(/€[\d,]+ a month/);

  // 12,000 borrowed over 48 months at 0% is exactly 250 a month.
  await page.getByLabel("Price").fill("15000");
  await page.getByLabel("Deposit").fill("3000");
  await page.getByLabel("Term").selectOption("48");
  await page.getByLabel("APR").fill("0");
  await expect(result(page)).toContainText("€250 a month");
  await expect(result(page)).toContainText("€12,000");
});

test("/finance shows what to fix, never NaN or a stale figure", async ({ page }) => {
  await open(page, "/finance");
  await page.getByLabel("Price").fill("15000");
  await page.getByLabel("Deposit").fill("15000");
  await expect(page.getByText("Deposit must be less than the price.")).toBeVisible();
  await expect(result(page)).toHaveText("Check the figures above.");

  await page.getByLabel("Deposit").fill("3000");
  await page.getByLabel("APR").fill("31");
  await expect(page.getByText("Enter an APR between 0 and 30.")).toBeVisible();
  await expect(result(page)).toHaveText("Check the figures above.");

  await page.getByLabel("APR").fill("9.9");
  await page.getByLabel("Price").fill("999");
  await expect(page.getByText("Enter a price between €1,000 and €250,000.")).toBeVisible();
  await expect(result(page)).toHaveText("Check the figures above.");
  expect(await page.locator("body").innerText()).not.toContain("NaN");
});
