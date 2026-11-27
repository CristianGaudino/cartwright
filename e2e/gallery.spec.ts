import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { inSoldWindow } from "../src/lib/stock/types";

type Demo = { slug: string; photos: { src: string }[]; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const car = cars.find((c) => !c.soldAt && c.photos.length >= 3);
const sold = cars.find((c) => inSoldWindow(c, Date.now()));
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

  // Not a request count: the thumbnails already fetch every photo file. Clicked in the page instead, so the scroll position is read in
  // the same task as the click: a jump is already there, a glide has not moved yet.
  test("a thumbnail more than one photo away jumps there at once, the next one glides", async ({ page }) => {
    await open(page, car!.slug);
    const at = (i: number) =>
      thumbs(page).nth(i).evaluate((b) => {
        (b as HTMLElement).click();
        const s = document.querySelector<HTMLElement>("[data-testid=gallery] [aria-roledescription=carousel]")!;
        return s.scrollLeft / s.clientWidth;
      });
    expect(await at(n - 1)).toBeCloseTo(n - 1, 1);
    await expect(counter(page)).toHaveText(`${n} / ${n}`);
    expect(await at(n - 2)).toBeGreaterThan(n - 1.5);
    await expect(counter(page)).toHaveText(`${n - 1} / ${n}`);
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

  test("zoom enlarges the photo, a tap toggles it, the arrows pan it and a close ends it", async ({ page }) => {
    await open(page, car!.slug);
    await whole(page).getByRole("button", { name: `View photo 1 of ${n} larger` }).click();
    const box = page.getByRole("dialog", { name: /^Photos of/ });
    const img = box.getByRole("img").first();
    const before = (await img.boundingBox())!.width;
    const zoom = box.getByRole("button", { name: "Zoom in" });
    await zoom.click();
    await expect(box.getByRole("button", { name: "Zoom out" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await img.boundingBox())!.width).toBeGreaterThan(before * 1.5);
    // Zoomed, the photo box takes focus for the arrows and the arrows do not change photo.
    await expect(box.getByRole("group", { name: `Photo 1 of ${n}` })).toBeVisible();
    await img.click();
    await expect(box.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await zoom.click();
    await page.keyboard.press("ArrowRight");
    await expect(dialogCounter(page)).toHaveText(`1 / ${n}`);
    await box.getByRole("button", { name: "Close photos" }).click();
    await whole(page).getByRole("button", { name: `View photo 1 of ${n} larger` }).click();
    await expect(box.getByRole("button", { name: "Zoom in" })).toBeVisible();
  });

  test("the open photo fades in once it has loaded", async ({ page }) => {
    await open(page, car!.slug);
    await whole(page).getByRole("button", { name: `View photo 2 of ${n} larger` }).click();
    const img = page.getByRole("dialog", { name: /^Photos of/ }).getByRole("img", { name: new RegExp(`photo 2 of ${n}$`) });
    await expect(img).toHaveAttribute("data-loaded", "");
    await expect(img).toHaveCSS("opacity", "1");
  });

  test("a photo that fails shows No photo yet, not a broken image", async ({ page }) => {
    const src = car!.photos[1].src;
    await page.route((url) => url.pathname === src, (r) => r.abort());
    await open(page, car!.slug);
    // Opened on photo 1: in the gallery, the failed photo's own "No photo yet" covers its open button.
    await whole(page).getByRole("button", { name: `View photo 1 of ${n} larger` }).click();
    await page.keyboard.press("ArrowRight");
    await expect(dialogCounter(page)).toHaveText(`2 / ${n}`);
    const slide = page.getByRole("dialog", { name: /^Photos of/ }).getByRole("group", { name: `Photo 2 of ${n}` });
    await expect(slide.locator("img")).toHaveAttribute("data-failed", "");
    await expect(slide.locator("img")).toBeHidden();
    await expect(slide.getByText("No photo yet")).toBeVisible();
  });

  // Our own animations only (the Web Animations API), not the CSS fades that run as the dialog and its photo appear.
  const zoomAnimations = (page: Page) =>
    page.getByRole("button", { name: /^Zoom (in|out)$/ }).evaluate(async (b) => {
      (b as HTMLElement).click();
      await new Promise(requestAnimationFrame); // a new animation is listed from the next frame
      return document.getAnimations().filter((a) => a.constructor === Animation).map((a) => (a.effect as KeyframeEffect).getComputedTiming().endTime as number);
    });
  async function openSettled(page: Page) {
    await open(page, car!.slug);
    await whole(page).getByRole("button", { name: `View photo 1 of ${n} larger` }).click();
    await expect(page.getByRole("dialog", { name: /^Photos of/ }).getByRole("img").first()).toHaveAttribute("data-loaded", "");
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  }

  test("zoom grows from the photo and back, in one animation under 300ms", async ({ page }) => {
    await openSettled(page);
    const zoomIn = await zoomAnimations(page);
    expect(zoomIn).toHaveLength(1);
    expect(zoomIn[0]).toBeLessThanOrEqual(300);
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    const zoomOut = await zoomAnimations(page);
    expect(zoomOut).toHaveLength(1);
    expect(zoomOut[0]).toBeLessThanOrEqual(300);
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test("with reduced motion, zoom changes at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openSettled(page);
    expect(await zoomAnimations(page)).toEqual([]);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.getByRole("button", { name: "Zoom out" })).toHaveAttribute("aria-pressed", "true");
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
