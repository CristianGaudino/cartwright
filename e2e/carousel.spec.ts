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
