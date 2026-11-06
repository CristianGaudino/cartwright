import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

declare global {
  interface Window {
    __cls: number;
  }
}

const imgs = (card: Locator) => card.locator("img");

test("only the first photo of the first two cards is eager", async ({ page }) => {
  await page.goto("/used-cars");
  const cards = page.locator("article");
  const first = imgs(cards.nth(0));
  await expect(first.first()).toHaveAttribute("fetchpriority", "high");
  await expect(first.first()).not.toHaveAttribute("loading", "lazy");
  expect(await first.count()).toBeGreaterThan(1);
  for (let i = 1; i < (await first.count()); i++) await expect(first.nth(i)).toHaveAttribute("loading", "lazy");
  await expect(imgs(cards.nth(2)).first()).toHaveAttribute("loading", "lazy");
});

test("the last photo is not requested until the buyer scrolls to it", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  await page.goto("/used-cars");
  await page.waitForLoadState("load");
  const photos = imgs(page.locator("article").first());
  const last = (await photos.last().getAttribute("src"))!;
  expect(requested).not.toContain(last);

  await page.locator("article").first().getByRole("group", { name: /^Photos of/ }).evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
  await expect.poll(() => requested.includes(last)).toBe(true);
});

test("every result image is a local /stock/ file", async ({ page }) => {
  await page.goto("/used-cars");
  const srcs = await page.locator("article img").evaluateAll((l) => l.map((i) => i.getAttribute("src")));
  expect(srcs.length).toBeGreaterThan(12);
  for (const src of srcs) expect(src).toMatch(/^\/stock\//);
});

test("scrolling the page and swiping cause no layout shift", async ({ page }) => {
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[]) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/used-cars");
  await page.waitForLoadState("load");
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.locator("article").first().scrollIntoViewIfNeeded();
  await page.locator("article").first().getByRole("group", { name: /^Photos of/ }).evaluate((el) => el.scrollTo({ left: el.clientWidth * 2, behavior: "instant" }));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.05);
});

const scroller = (card: Locator) => card.getByRole("group", { name: /^Photos of/ });

test("touch: no arrows, dots follow the swipe, photos fade in", async ({ page }) => {
  await page.goto("/used-cars");
  const card = page.locator("article").first();
  await expect(page.locator('button[aria-label="Next photo"]').first()).toBeHidden();
  await expect(card.locator("img").first()).toHaveAttribute("data-loaded", "");
  const dots = card.locator("[data-dot]");
  expect(await dots.count()).toBe(await card.locator("img").count());
  await expect(dots.first()).toHaveAttribute("data-active", "");
  await scroller(card).evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" }));
  await expect(dots.nth(1)).toHaveAttribute("data-active", "");
});

test("a blocked photo leaves the grey 4:3 box and no broken image", async ({ page }) => {
  await page.route("**/stock/**", (r) => r.abort());
  await page.goto("/used-cars");
  const card = page.locator("article").first();
  const box = (await card.locator("> div").first().boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(4 / 3, 1);
  await expect(card.locator("img").first()).toHaveCSS("visibility", "hidden");
});

test.describe("desktop pointer", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("arrows appear on hover, move one photo and hide at the ends", async ({ page }) => {
    await page.goto("/used-cars");
    const card = page.locator("article").first();
    const next = card.getByRole("button", { name: "Next photo" });
    const previous = card.getByRole("button", { name: "Previous photo" });
    await card.hover();
    await expect(next).toHaveCSS("opacity", "1");
    await expect(previous).toHaveCount(0);
    await next.click();
    const width = await scroller(card).evaluate((el) => el.clientWidth);
    await expect.poll(() => scroller(card).evaluate((el) => el.scrollLeft)).toBe(width);
    await expect(previous).toBeVisible();
    // Last photo: Next goes away.
    await scroller(card).evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
    await expect(next).toHaveCount(0);
  });
});

test("a tap on the photo opens the car page", async ({ page }) => {
  await page.goto("/used-cars");
  await page.locator("article").first().locator("img").first().tap();
  await expect(page).toHaveURL(/\/used-cars\/[a-z0-9-]+$/);
});
