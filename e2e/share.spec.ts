import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";

type Demo = { id: string; slug: string; make: string; model: string; year: number; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const soldInPeriod = cars.find((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > Date.now());
const SKIP = "No demo car is inside the sold window: run npm run stock:build to refresh the demo dates";
const ORIGIN = "https://carright.cgaudino.com";

const WA = "https://wa.me/?text=";
const decode = (href: string | null) => decodeURIComponent((href ?? "").slice(WA.length));

async function firstCarHref(page: Page) {
  await page.goto("/used-cars");
  return (await page.locator("article h2 a").first().getAttribute("href"))!;
}

// A click before React attaches does nothing on a touch device.
async function open(page: Page, href: string) {
  await page.goto(href);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}

const shareButton = (page: Page) => page.getByTestId("buy-box").getByRole("button", { name: "Share", exact: true });

test.describe("share a car", () => {
  test("the server HTML already has a WhatsApp link with the price and the canonical URL", async ({ page, request }) => {
    const href = await firstCarHref(page);
    const html = await (await request.get(href)).text();
    const m = /href="(https:\/\/wa\.me\/\?text=[^"]+)"/.exec(html);
    expect(m).not.toBeNull();
    const text = decode(m![1].replaceAll("&amp;", "&"));
    expect(text).toMatch(/€[\d,]+/);
    expect(text).toContain(`${ORIGIN}${href}`);
  });

  test("without a native sheet, Share opens a menu with WhatsApp and Copy link", async ({ page }) => {
    const href = await firstCarHref(page);
    await open(page, href);
    await shareButton(page).click();
    const wa = page.getByRole("link", { name: "Share on WhatsApp" });
    await expect(wa).toBeVisible();
    await expect(wa).toHaveAttribute("rel", /noopener/);
    const text = decode(await wa.getAttribute("href"));
    expect(text).toMatch(/€[\d,]+/);
    expect(text).toContain(`${ORIGIN}${href}`);
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
  });

  test("Copy link puts the canonical URL on the clipboard and says so", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const href = await firstCarHref(page);
    await open(page, href);
    await shareButton(page).click();
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${ORIGIN}${href}`);
    await expect(page.getByRole("button", { name: "Link copied" })).toHaveCount(0, { timeout: 4000 });
    await expect(shareButton(page)).toBeFocused();
  });

  test("a blocked clipboard says so and WhatsApp stays", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) } });
    });
    await open(page, await firstCarHref(page));
    await shareButton(page).click();
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Could not copy the link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toBeVisible();
  });

  test("Escape closes the menu and returns focus to Share", async ({ page }) => {
    await open(page, await firstCarHref(page));
    await shareButton(page).click();
    await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveCount(0);
    await expect(shareButton(page)).toBeFocused();
  });

  test.describe("with a native share sheet", () => {
    test("Share calls navigator.share once with the title, text and URL and opens no menu", async ({ page }) => {
      await page.addInitScript(() => {
        (window as unknown as { shared: unknown[] }).shared = [];
        navigator.share = (data) => {
          (window as unknown as { shared: unknown[] }).shared.push(data);
          return Promise.resolve();
        };
      });
      const href = await firstCarHref(page);
      await open(page, href);
      await shareButton(page).click();
      const shared = await page.evaluate(() => (window as unknown as { shared: { title: string; text: string; url: string }[] }).shared);
      expect(shared).toHaveLength(1);
      expect(shared[0].url).toBe(`${ORIGIN}${href}`);
      expect(shared[0].title).toMatch(/^\d{4} \S+/);
      expect(shared[0].text).toMatch(new RegExp(`^${shared[0].title}, €[\\d,]+$`));
      await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveCount(0);
    });

    test("cancelling the sheet shows nothing", async ({ page }) => {
      await page.addInitScript(() => {
        navigator.share = () => Promise.reject(new DOMException("cancelled", "AbortError"));
      });
      await open(page, await firstCarHref(page));
      await shareButton(page).click();
      await page.waitForTimeout(200);
      await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveCount(0);
    });

    test("any other failure falls back to the menu", async ({ page }) => {
      await page.addInitScript(() => {
        navigator.share = () => Promise.reject(new DOMException("nope", "NotAllowedError"));
      });
      await open(page, await firstCarHref(page));
      await shareButton(page).click();
      await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toBeVisible();
    });
  });

  test("a sold car shares without a price or a sale date", async ({ request }) => {
    test.skip(!soldInPeriod, SKIP);
    const html = await (await request.get(`/used-cars/${soldInPeriod!.slug}`)).text();
    const m = /href="(https:\/\/wa\.me\/\?text=[^"]+)"/.exec(html);
    expect(m).not.toBeNull();
    const text = decode(m![1].replaceAll("&amp;", "&"));
    expect(text).not.toContain("€");
    expect(text).not.toContain(soldInPeriod!.soldAt!);
    expect(text).toContain(`${ORIGIN}/used-cars/${soldInPeriod!.slug}`);
  });
});

test("a car page announces its generated image and the large card, with absolute URLs", async ({ page, request }) => {
  const href = await firstCarHref(page);
  const car = cars.find((c) => href.endsWith(c.slug))!;
  await page.goto(href);
  const meta = (sel: string) => page.locator(sel).getAttribute("content");
  expect(await meta('meta[property="og:image"]')).toBe(`${ORIGIN}/og/${car.id}.jpg`);
  expect(await meta('meta[property="og:image:width"]')).toBe("1200");
  expect(await meta('meta[property="og:image:height"]')).toBe("630");
  expect(await meta('meta[property="og:image:alt"]')).toBe(`${car.year} ${car.make} ${car.model}`);
  expect(await meta('meta[property="og:title"]')).toBeTruthy();
  expect(await meta('meta[property="og:description"]')).toBeTruthy();
  expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
  const image = await request.get(`/og/${car.id}.jpg`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/jpeg");
});
