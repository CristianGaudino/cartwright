import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const savedLink = (page: Page) => page.getByRole("banner").getByRole("link", { name: /^Saved cars/ });
const firstHeart = (page: Page) => page.locator("article").first().getByRole("button", { name: /^Save / });

test("a heart saves a car without leaving the page and the count survives a reload", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars");
  const url = page.url();

  await firstHeart(page).click();
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "true");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  expect(page.url()).toBe(url);

  const stored = await page.evaluate(() => localStorage.getItem("cartwright:saved-ids"));
  const ids = JSON.parse(stored!) as unknown[];
  expect(ids).toHaveLength(1);
  for (const id of ids) expect(id).toMatch(/^\d{1,12}$/);

  await page.reload();
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "true");

  await firstHeart(page).click();
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "false");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars");
});

test("the Saved link is the same width before hydration and with a count", async ({ page, browser }) => {
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const raw = await noJs.newPage();
  await raw.goto("/used-cars");
  const before = (await savedLink(raw).boundingBox())!.width;
  await noJs.close();

  await page.goto("/used-cars");
  await firstHeart(page).click();
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  expect((await savedLink(page).boundingBox())!.width).toBe(before);
});

test("saving in one tab updates another tab without a reload", async ({ context }) => {
  const [a, b] = [await context.newPage(), await context.newPage()];
  await a.goto("/used-cars");
  await b.goto("/used-cars");
  await expect(savedLink(b)).toHaveAccessibleName("Saved cars");

  await firstHeart(a).click();
  await expect(savedLink(b)).toHaveAccessibleName("Saved cars, 1");
  await expect(firstHeart(b)).toHaveAttribute("aria-pressed", "true");
});

test("saving and unsaving are announced", async ({ page }) => {
  await page.goto("/used-cars");
  const live = page.locator("article").first().locator('[aria-live="polite"]');
  await firstHeart(page).click();
  await expect(live).toHaveText("Saved");
  await firstHeart(page).click();
  await expect(live).toHaveText("Removed from saved");
});

test("with storage blocked a heart still toggles and nothing errors", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (e) => errors.push(e));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked", "QuotaExceededError");
    };
  });
  await page.goto("/used-cars");
  await firstHeart(page).click();
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "true");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  await firstHeart(page).click();
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

test("at 320px the header fits without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/used-cars");
  await firstHeart(page).click();
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
