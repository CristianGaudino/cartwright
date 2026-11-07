import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

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
  await expect(card).toBeVisible(); // the first-load skeleton can still be up just after load
  const box = (await card.locator("> div").first().boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(4 / 3, 1);
  await expect(card.locator("img").first()).toHaveCSS("visibility", "hidden");
});

test.describe("desktop pointer", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  const arrows = (card: Locator) => ({ next: card.getByRole("button", { name: "Next photo" }), previous: card.getByRole("button", { name: "Previous photo" }) });
  const waitReact = (page: Page) => page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));

  test("arrows appear on hover, move one photo and go quiet at the ends", async ({ page }) => {
    await page.goto("/used-cars");
    const card = page.locator("article").first();
    const { next, previous } = arrows(card);
    await card.hover();
    await expect(next).toHaveCSS("opacity", "1");
    // First photo: Previous stays mounted but is inert and invisible.
    await expect(previous).toBeDisabled();
    await expect(previous).toHaveCSS("opacity", "0");
    await next.click();
    const width = await scroller(card).evaluate((el) => el.clientWidth);
    await expect.poll(() => scroller(card).evaluate((el) => el.scrollLeft)).toBe(width);
    await expect(previous).toBeEnabled();
    await expect(previous).toHaveCSS("opacity", "1");
    // Last photo: Next goes inert and invisible.
    await scroller(card).evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
    await expect(next).toBeDisabled();
    await expect(next).toHaveCSS("opacity", "0");
  });

  test("arrows appearing and disappearing move nothing", async ({ page }) => {
    await page.goto("/used-cars");
    const card = page.locator("article").first();
    const { next, previous } = arrows(card);
    const boxes = async () => [await next.boundingBox(), await previous.boundingBox(), await scroller(card).boundingBox()];
    const before = await boxes();
    await scroller(card).evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" }));
    await expect(previous).toBeEnabled();
    expect(await boxes()).toEqual(before);
    await scroller(card).evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
    await expect(next).toBeDisabled();
    expect(await boxes()).toEqual(before);
  });

  test("keyboard: Next and Previous keep focus at both ends and move one photo per press", async ({ page }) => {
    await page.goto("/used-cars");
    await waitReact(page);
    const card = page.locator("article").first();
    const { next, previous } = arrows(card);
    const dots = card.locator("[data-dot]");
    const n = await dots.count();
    expect(n).toBeGreaterThan(2);

    await next.focus();
    for (let i = 1; i < n; i++) {
      await page.keyboard.press("Enter");
      await expect(dots.nth(i)).toHaveAttribute("data-active", "");
    }
    // The last photo is not the end: Next is still live and one more press shows the See all photos tile.
    await expect(next).toBeEnabled();
    await page.keyboard.press("Enter");
    await expect(card.locator("[data-dot][data-active]")).toHaveCount(0);
    // On the tile: focus did not fall back to the page, Next is inert but still there, and a further press does nothing.
    await expect(next).toBeFocused();
    await expect(next).toBeDisabled();
    await expect(next).toHaveCSS("opacity", "0.4"); // dimmed, not gone, while the keyboard is on it
    await page.keyboard.press("Enter");
    await expect(next).toBeFocused();
    await expect(card.locator("[data-dot][data-active]")).toHaveCount(0);

    // Shift+Tab lands on Previous, which walks back through every photo; at the first photo it keeps focus the same way.
    await page.keyboard.press("Shift+Tab");
    await expect(previous).toBeFocused();
    for (let i = n - 1; i >= 0; i--) {
      await page.keyboard.press("Enter");
      await expect(dots.nth(i)).toHaveAttribute("data-active", "");
    }
    await expect(previous).toBeFocused();
    await expect(previous).toBeDisabled();
    await page.keyboard.press("Enter");
    await expect(previous).toBeFocused();
    await expect(dots.first()).toHaveAttribute("data-active", "");
  });

  test("the See all photos tile ends the carousel, is a link in the tab order and opens the car page", async ({ page }) => {
    await page.goto("/used-cars");
    await waitReact(page);
    const card = page.locator("article").first();
    const { next } = arrows(card);
    const n = await card.locator("img").count();
    const href = (await card.locator("h2 a").getAttribute("href"))!;
    const tile = card.getByRole("group", { name: `See all ${n} photos`, exact: true });
    const link = tile.getByRole("link", { name: `See all ${n} photos`, exact: true });

    await expect(next).toBeEnabled();
    await scroller(card).evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
    await expect(next).toHaveAttribute("aria-disabled", "true");
    await expect(card.locator("[data-dot][data-active]")).toHaveCount(0);
    await expect(tile).toHaveAttribute("aria-roledescription", "slide");
    await expect(link).toHaveAttribute("href", href);
    await expect(link).not.toHaveAttribute("tabindex", /.*/);

    // In the tab order: from the card title, Shift+Tab goes Save, Next, Previous, then the tile link.
    await card.locator("h2 a").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(card.getByRole("button", { name: /^Save / })).toBeFocused();
    for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+Tab");
    await expect(link).toBeFocused();

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    expect((await page.request.get(href)).status()).toBe(200);
  });

  test("screen readers get one named slide per photo, each image named for the car", async ({ page }) => {
    await page.goto("/used-cars");
    const card = page.locator("article").first();
    const n = await card.locator("img").count();
    await expect(scroller(card)).toHaveAttribute("aria-roledescription", "carousel");
    const name = (await card.locator("img").first().getAttribute("alt"))!;
    expect(name).toMatch(/^\d{4} \S/); // year make model
    for (let i = 1; i <= n; i++) {
      const slide = card.getByRole("group", { name: `Photo ${i} of ${n}`, exact: true });
      await expect(slide).toHaveAttribute("aria-roledescription", "slide");
      // Not aria-hidden: the image is named for the car, inside a link to it that stays out of the tab order.
      await expect(slide.getByRole("img", { name, exact: true })).toHaveCount(1);
      await expect(slide.getByRole("link", { name, exact: true })).toHaveAttribute("tabindex", "-1");
    }
  });
});

test("a tap on the photo opens the car page", async ({ page }) => {
  await page.goto("/used-cars");
  await page.locator("article").first().locator("img").first().tap();
  await expect(page).toHaveURL(/\/used-cars\/[a-z0-9-]+$/);
});
