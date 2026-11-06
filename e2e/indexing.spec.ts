import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// The build under test and this runner get the same APP_ENV (CI's e2e job sets production).
const production = process.env.APP_ENV === "production";

const robotsMeta = (page: Page) => page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute("content") ?? ""));

async function expectIndexing(page: Page, path: string, indexed: boolean) {
  await page.goto(path);
  const robots = await robotsMeta(page);
  const noindex = robots.some((c) => c.includes("noindex"));
  expect(noindex, `${path} robots meta: ${robots.join(" | ")}`).toBe(!indexed);
}

test("car pages and the home page follow APP_ENV", async ({ page }) => {
  await page.goto("/used-cars");
  const href = await page.locator('article a[href^="/used-cars/"]').first().getAttribute("href");
  expect(href).toBeTruthy();
  await expectIndexing(page, href!, production);
  await expectIndexing(page, "/", production);
});
