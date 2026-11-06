import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";

type Demo = { slug: string; make: string; makeSlug: string; year: number; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const soldInPeriod = cars.find((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > Date.now());
const SKIP = "No demo car is inside the sold window: run npm run stock:redate to refresh the demo dates";

const buyBox = (page: Page) => page.getByTestId("buy-box");

async function firstCarHref(page: Page) {
  await page.goto("/used-cars");
  return (await page.locator("article h2 a").first().getAttribute("href"))!;
}

test.describe("a car for sale", () => {
  test("shows the title, price, key facts and Call now at once on a phone", async ({ page }) => {
    await page.goto(await firstCarHref(page));
    const box = buyBox(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const price = box.getByText(/^€[\d,]+$/);
    await expect(price).toBeVisible();

    const call = box.getByRole("link", { name: "Call now" });
    await expect(call).toHaveAttribute("href", "tel:+353831333154");
    await expect(page.getByTestId("action-area")).toHaveCSS("min-height", "104px");

    const tiles = box.locator("dl > div");
    const n = await tiles.count();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(4);
    for (const t of await tiles.allTextContents()) expect(t.trim().length).toBeGreaterThan(0);

    const viewport = page.viewportSize()!.height;
    expect((await price.boundingBox())!.y).toBeLessThan(viewport);
    expect((await tiles.first().boundingBox())!.y).toBeLessThan(viewport);
  });

  test("does not scroll sideways at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(await firstCarHref(page));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("the buy box is a 360px card to the right of the photo, with the phone number under Call now", async ({ page }) => {
    await page.goto(await firstCarHref(page));
    const box = (await buyBox(page).boundingBox())!;
    const photo = (await page.locator("main img").first().boundingBox())!;
    expect(box.width).toBe(360);
    expect(box.x).toBeGreaterThan(photo.x + photo.width);
    expect(box.y).toBeLessThan(photo.y + photo.height);
    await expect(buyBox(page).getByText("083 133 3154")).toBeVisible();
    await expect(page.getByTestId("action-area")).toHaveCSS("min-height", "0px");
  });
});

test.describe("a sold car", () => {
  test.skip(!soldInPeriod, SKIP);

  test("reads Sold with no price, no Call now and a way on to the make", async ({ page, request }) => {
    const { slug, make, makeSlug, soldAt } = soldInPeriod!;
    await page.goto(`/used-cars/${slug}`);
    const box = buyBox(page);
    await expect(box.getByText("Sold", { exact: true }).first()).toBeVisible();
    // The badge sits above the title.
    const badge = (await box.getByText("Sold", { exact: true }).first().boundingBox())!;
    expect(badge.y).toBeLessThan((await page.getByRole("heading", { level: 1 }).boundingBox())!.y);
    await expect(box.getByText("This car is no longer for sale.")).toBeVisible();
    await expect(box.getByRole("link", { name: `See more ${make}` })).toHaveAttribute("href", `/used-cars/${makeSlug}`);
    await expect(box.getByText("Call now")).toHaveCount(0);
    expect(await box.innerText()).not.toMatch(/€\d/);

    const html = await (await request.get(`/used-cars/${slug}`)).text();
    expect(html).not.toContain(soldAt!);
  });
});

type Rich = Demo & { features: string[]; maxSpeedMph?: number; description: string };
const rich = (cars as Rich[]).find((c) => !c.soldAt && c.features?.length > 12 && c.maxSpeedMph && c.description?.includes("\n"));
const ORDER = ["Year", "Mileage", "Fuel", "Transmission", "Body type", "Engine", "Colour", "Doors", "Seats", "Owners", "NCT expires", "Max speed", "0 to 62 mph"];
const section = (page: Page, name: string) => page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name, exact: true }) });

test.describe("the sections below the buy box", () => {
  test.skip(!rich, "No in-stock demo car has more than 12 features, a max speed and a multi-line description");

  test("Specifications show present rows in order, with no tax row and a max speed in mph", async ({ page }) => {
    await page.goto(`/used-cars/${rich!.slug}`);
    const spec = section(page, "Specifications");
    const labels = await spec.locator("dt").allTextContents();
    const values = await spec.locator("dd").allTextContents();
    expect(labels.length).toBe(values.length);
    expect(labels.map((l) => ORDER.indexOf(l))).toEqual(labels.map((l) => ORDER.indexOf(l)).sort((a, b) => a - b));
    for (const l of labels) expect(ORDER).toContain(l);
    for (const v of values) expect(v.trim()).not.toMatch(/^$|undefined/);
    expect(labels.some((l) => /tax/i.test(l))).toBe(false);
    expect(values[labels.indexOf("Max speed")]).toMatch(/ mph$/);
  });

  test("Equipment shows 12 items, then all of them behind Show all", async ({ page }) => {
    await page.goto(`/used-cars/${rich!.slug}`);
    const n = rich!.features.length;
    const items = section(page, "Equipment").locator("li:visible");
    await expect(items).toHaveCount(12);
    await section(page, "Equipment").getByText(`Show all ${n}`).click();
    await expect(items).toHaveCount(n);
    await expect(section(page, "Equipment").getByText("Show fewer")).toBeVisible();
  });

  test("About this car keeps the dealer's line breaks", async ({ page }) => {
    await page.goto(`/used-cars/${rich!.slug}`);
    expect(await section(page, "About this car").locator("p").innerText()).toContain("\n");
  });

  test("Similar cars shows 1 to 3 other cars, and the page has one h1 and h2 sections", async ({ page }) => {
    await page.goto(`/used-cars/${rich!.slug}`);
    const cards = section(page, "Similar cars").locator("article");
    const n = await cards.count();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(3);
    for (const href of await cards.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) expect(href).not.toBe(`/used-cars/${rich!.slug}`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: "Specifications" })).toBeVisible();
  });
});

const ORIGIN = "https://carright.cgaudino.com";
const jsonLd = async (page: Page) => {
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  return JSON.parse((await scripts.textContent())!);
};
const description = (page: Page) => page.locator('meta[name="description"]').getAttribute("content");

test("an in-stock car page has a canonical URL, a description and Product plus Car JSON-LD", async ({ page }) => {
  const href = await firstCarHref(page);
  await page.goto(href);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${ORIGIN}${href}`);
  expect(await description(page)).toMatch(/Tralee, Co\. Kerry\.$/);
  const ld = await jsonLd(page);
  expect(ld["@type"]).toEqual(expect.arrayContaining(["Car", "Product"]));
  const shown = await buyBox(page).getByText(/^€[\d,]+$/).textContent();
  expect(ld.offers.price).toBe(Number(shown!.replace(/\D/g, "")));
  expect(ld.offers.availability).toBe("https://schema.org/InStock");
});

test.describe("a sold car's metadata", () => {
  test.skip(!soldInPeriod, SKIP);

  test("is SoldOut with no price, and the description says Sold.", async ({ page }) => {
    await page.goto(`/used-cars/${soldInPeriod!.slug}`);
    const ld = await jsonLd(page);
    expect(ld.offers.availability).toBe("https://schema.org/SoldOut");
    expect(ld.offers).not.toHaveProperty("price");
    expect(await description(page)).toContain("Sold.");
  });
});

test("an unknown slug is a real 404", async ({ request }) => {
  expect((await request.get("/used-cars/not-a-car")).status()).toBe(404);
});
