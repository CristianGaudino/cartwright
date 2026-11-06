import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";

type Demo = { slug: string; photos: unknown[]; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const car = cars.find((c) => !c.soldAt && c.photos.length >= 3);
const sold = cars.find((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > Date.now());
const n = car?.photos.length ?? 0;

test.skip(!car, "No in-stock demo car has 3 or more photos");

const whole = (page: Page) => page.getByTestId("gallery");
const gallery = (page: Page) => whole(page).getByRole("group", { name: /^Photos of/ });
const counter = (page: Page) => gallery(page).locator("..").getByText(/^\d+ \/ \d+$/);
const thumbs = (page: Page) => whole(page).getByRole("button", { name: /^Show photo/ });
// A click before React attaches does nothing on a touch device.
async function open(page: Page, slug: string) {
  await page.goto(`/used-cars/${slug}`);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}

test("the first photo is eager and high priority, the rest are lazy", async ({ page }) => {
  await open(page, car!.slug);
  const imgs = gallery(page).locator("img");
  expect(await imgs.count()).toBe(n);
  await expect(imgs.first()).toHaveAttribute("fetchpriority", "high");
  await expect(imgs.first()).not.toHaveAttribute("loading", "lazy");
  for (let i = 1; i < n; i++) await expect(imgs.nth(i)).toHaveAttribute("loading", "lazy");
});

test("the counter follows the swipe and is hidden from screen readers", async ({ page }) => {
  await open(page, car!.slug);
  await expect(counter(page)).toHaveText(`1 / ${n}`);
  await expect(counter(page)).toHaveAttribute("aria-hidden", "true");
  await gallery(page).evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" }));
  await expect(counter(page)).toHaveText(`2 / ${n}`);
});

test("at 320px the page does not scroll sideways and the price and first fact are above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 915 });
  await open(page, car!.slug);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const box = page.getByTestId("buy-box");
  expect((await box.getByText(/^€[\d,]+$/).filter({ visible: true }).boundingBox())!.y).toBeLessThan(915);
  expect((await box.locator("dl > div").first().boundingBox())!.y).toBeLessThan(915);
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("a thumbnail per photo; clicking one moves the gallery, rings it and does not scroll the page", async ({ page }) => {
    await open(page, car!.slug);
    await expect(thumbs(page)).toHaveCount(n);
    await page.evaluate(() => window.scrollTo(0, 120));
    const before = await page.evaluate(() => window.scrollY);
    await thumbs(page).nth(2).click();
    await expect(counter(page)).toHaveText(`3 / ${n}`);
    await expect(thumbs(page).nth(2)).toHaveAttribute("aria-current", "true");
    await expect(thumbs(page).nth(0)).not.toHaveAttribute("aria-current", "true");
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test("Next and Previous move one photo and are inert at the ends", async ({ page }) => {
    await open(page, car!.slug);
    const next = whole(page).getByRole("button", { name: "Next photo" });
    const prev = whole(page).getByRole("button", { name: "Previous photo" });
    await expect(prev).toHaveAttribute("aria-disabled", "true");
    await gallery(page).hover();
    await next.click();
    await expect(counter(page)).toHaveText(`2 / ${n}`);
    await gallery(page).hover();
    await prev.click();
    await expect(counter(page)).toHaveText(`1 / ${n}`);
  });
});

test.describe("a sold car", () => {
  test.skip(!sold, "No demo car is inside the sold window: run npm run stock:redate to refresh the demo dates");

  test("the gallery carries the Sold badge on its photo", async ({ page }) => {
    await open(page, sold!.slug);
    const badge = page.locator('main span[aria-hidden="true"]', { hasText: /^Sold$/ });
    await expect(badge).toBeVisible();
    const g = (await gallery(page).boundingBox())!;
    const b = (await badge.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(g.x);
    expect(b.y).toBeGreaterThanOrEqual(g.y);
    expect(b.y + b.height).toBeLessThanOrEqual(g.y + g.height);
  });
});

const dialogCounter = (page: Page) => page.getByRole("dialog", { name: /^Photos of/ }).getByText(/^\d+ \/ \d+$/);

test.describe("the lightbox", () => {
  test("opens at the tapped photo, moves with the arrow keys, fills the screen and gives focus back", async ({ page }) => {
    await open(page, car!.slug);
    await gallery(page).evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" }));
    await expect(counter(page)).toHaveText(`2 / ${n}`);
    const opener = whole(page).getByRole("button", { name: `View photo 2 of ${n} larger` });
    await opener.click();

    const box = page.getByRole("dialog", { name: /^Photos of/ });
    await expect(box).toBeVisible();
    await expect(dialogCounter(page)).toHaveText(`2 / ${n}`);
    await expect(box.getByRole("button", { name: "Close photos" })).toBeFocused();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

    await page.keyboard.press("ArrowRight");
    await expect(dialogCounter(page)).toHaveText(`3 / ${n}`);
    await page.keyboard.press("ArrowLeft");
    await expect(dialogCounter(page)).toHaveText(`2 / ${n}`);
    await page.keyboard.press("ArrowRight");
    await expect(dialogCounter(page)).toHaveText(`3 / ${n}`);

    const view = page.viewportSize()!;
    const rect = (await box.boundingBox())!;
    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([0, 0, view.width, view.height]);

    await page.keyboard.press("Escape");
    await expect(box).toBeHidden();
    await expect(opener).toBeFocused();
    // Moving inside the lightbox does not move the gallery.
    await expect(counter(page)).toHaveText(`2 / ${n}`);
  });

  test("Close photos closes it", async ({ page }) => {
    await open(page, car!.slug);
    await whole(page).getByRole("button", { name: `View photo 1 of ${n} larger` }).click();
    const box = page.getByRole("dialog", { name: /^Photos of/ });
    await box.getByRole("button", { name: "Close photos" }).click();
    await expect(box).toBeHidden();
  });

  test.describe("on a desktop", () => {
    test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

    test("Previous and Next move one photo and go inert at the ends", async ({ page }) => {
      await open(page, car!.slug);
      await whole(page).getByRole("button", { name: `View photo 1 of ${n} larger` }).click();
      const box = page.getByRole("dialog", { name: /^Photos of/ });
      await expect(box.getByRole("button", { name: "Previous photo" })).toHaveAttribute("aria-disabled", "true");
      await box.getByRole("button", { name: "Next photo" }).click();
      await expect(dialogCounter(page)).toHaveText(`2 / ${n}`);
    });
  });
});
