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
  test("shows the title, price, key facts and Call Us at once on a phone", async ({ page }) => {
    await page.goto(await firstCarHref(page));
    const box = buyBox(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The closed lead dialog in the buy box also shows the price, so take the visible one.
    const price = box.getByText(/^€[\d,]+$/).filter({ visible: true });
    await expect(price).toBeVisible();

    const call = box.getByRole("link", { name: /^Call Us/ });
    await expect(call).toHaveAttribute("href", "tel:+353831333154");
    await expect(box.getByRole("link", { name: /^WhatsApp/ })).toHaveAttribute("href", /^https:\/\/wa\.me\/353831333154\?text=/);
    await expect(box.getByRole("button", { name: "Enquire About This Car", exact: true })).toBeVisible();
    await expect(box.getByRole("button", { name: "Book a Test Drive", exact: true })).toBeVisible();
    await expect(box.getByRole("button", { name: /Reserve/ })).toHaveCount(0);

    const tiles = box.locator("dl > div");
    const n = await tiles.count();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(4);
    for (const t of await tiles.allTextContents()) expect(t.trim().length).toBeGreaterThan(0);

    const viewport = page.viewportSize()!.height;
    expect((await price.boundingBox())!.y).toBeLessThan(viewport);
    expect((await tiles.first().boundingBox())!.y).toBeLessThan(viewport);
  });

  test("holds its four buttons at 320px without sideways scroll, and nothing below moves on hydration", async ({ page, browser }) => {
    const viewport = { width: 320, height: 640 };
    await page.setViewportSize(viewport);
    const href = await firstCarHref(page);
    // The top of what follows the buy box, measured on the server render (no JavaScript) and after hydration.
    const below = (p: Page) => p.evaluate(() => document.querySelector("[data-testid=buy-box]")!.parentElement!.nextElementSibling!.getBoundingClientRect().top + scrollY);
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport });
    const before = await noJs.newPage();
    await before.goto(href);
    const serverTop = await below(before);
    await noJs.close();

    await page.goto(href);
    await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
    const area = page.getByTestId("action-area");
    const buttons = area.locator("a, button").filter({ visible: true });
    await expect(buttons).toHaveCount(4);
    for (const b of await buttons.all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect(await below(page)).toBe(serverTop);
  });

  test("does not scroll sideways at 320px, and Save sits at or above the price row", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(await firstCarHref(page));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const price = (await buyBox(page).getByText(/^€[\d,]+$/).filter({ visible: true }).boundingBox())!;
    const save = (await buyBox(page).getByRole("button", { name: "Save this car" }).boundingBox())!;
    expect(save.y).toBeLessThan(price.y + price.height);
  });

  test("Save this car beside Share saves the car and counts it in the header", async ({ page }) => {
    await page.goto(await firstCarHref(page));
    const save = buyBox(page).getByRole("button", { name: "Save this car" });
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("banner").getByRole("link", { name: "Saved cars, 1" })).toBeVisible();
    const share = (await buyBox(page).getByText("Share", { exact: true }).boundingBox())!;
    const s = (await save.boundingBox())!;
    expect(s.width).toBe(44);
    // The heart sits at the top right beside the title, as in the mockup; Share is lower, beside the price.
    const title = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    expect(s.y).toBeLessThan(title.y + title.height);
    expect(share.y).toBeGreaterThan(s.y);
  });
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("the buy box is the right-hand column, flat, beside the photo and at its height", async ({ page }) => {
    await page.goto(await firstCarHref(page));
    const box = (await buyBox(page).boundingBox())!;
    const photo = (await page.locator("main img").first().boundingBox())!;
    expect(box.width).toBeGreaterThan(420);
    expect(box.x).toBeGreaterThan(photo.x + photo.width);
    expect(box.y).toBeLessThan(photo.y + photo.height);
    await expect(buyBox(page)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)"); // no card behind it
    // The three main buttons share one row, Enquire widest.
    const row = ["Enquire About This Car", "Call Us", "WhatsApp"];
    const boxes = [];
    for (const name of row) boxes.push((await buyBox(page).getByRole(name === "Enquire About This Car" ? "button" : "link", { name: new RegExp(`^${name}`) }).boundingBox())!);
    expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);
    expect(boxes[0].width).toBeGreaterThan(boxes[1].width);
  });
});

test.describe("a sold car", () => {
  test.skip(!soldInPeriod, SKIP);

  test("reads Sold with no price, no Call Us and a way on to the make", async ({ page, request }) => {
    const { slug, make, makeSlug, soldAt } = soldInPeriod!;
    await page.goto(`/used-cars/${slug}`);
    const box = buyBox(page);
    // Sold shows twice: the badge on the photo and the card here. No third pill above the title.
    await expect(box.getByText("Sold", { exact: true })).toHaveCount(1);
    const card = (await box.getByText("Sold", { exact: true }).boundingBox())!;
    expect(card.y).toBeGreaterThan((await page.getByRole("heading", { level: 1 }).boundingBox())!.y);
    await expect(page.getByRole("main").getByText("Sold", { exact: true })).toHaveCount(2);
    await expect(box.getByText("This car is no longer for sale.")).toBeVisible();
    await expect(box.getByRole("link", { name: `See more ${make}` })).toHaveAttribute("href", `/used-cars/${makeSlug}`);
    await expect(box.getByText("Call now")).toHaveCount(0);
    await expect(box.getByRole("button", { name: "Save this car" })).toBeVisible();
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
    expect(await section(page, "About This Car").locator("p").innerText()).toContain("\n");
  });

  test("Similar cars shows 1 to 3 other cars, and the page has one h1 and h2 sections", async ({ page }) => {
    await page.goto(`/used-cars/${rich!.slug}`);
    const cards = section(page, "Similar Cars").locator("article");
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
  const shown = await buyBox(page).getByText(/^€[\d,]+$/).filter({ visible: true }).textContent();
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
