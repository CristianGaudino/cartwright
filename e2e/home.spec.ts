import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

type Demo = { id: string; slug: string; make: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const inStock = cars.filter((c) => !c.soldAt).sort((a, b) => Number(b.id) - Number(a.id));
const newest = inStock[0];

test("title, one h1 and a search that lands on used cars", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Carright | Used cars in Tralee");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  await page.getByRole("searchbox", { name: "Search make or model" }).fill(newest.make);
  await page.getByRole("searchbox", { name: "Search make or model" }).press("Enter");
  await expect(page).toHaveURL(/\/used-cars\?/);
  expect(new URL(page.url()).searchParams.get("q")).toBe(newest.make);
});

test("latest arrivals: the newest in-stock cars and See all", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Latest arrivals" }) });
  const cards = section.locator("article");
  await expect(cards).toHaveCount(Math.min(6, inStock.length));
  await expect(cards.first().locator("a").first()).toHaveAttribute("href", `/used-cars/${newest.slug}`);
  await expect(section.getByRole("link", { name: `See all ${inStock.length} used cars` })).toHaveAttribute("href", "/used-cars");
});

// Tailwind's active:scale-* sets the scale property; a transition that only lists transform makes the press snap (#45).
test("press feedback eases scale, and header links are 44px tall", async ({ page }) => {
  await page.goto("/");
  for (const el of [page.locator("article").first(), page.getByRole("button", { name: "Search" }), page.getByRole("main").getByRole("link", { name: /^Finance/ })]) {
    await expect(el).toHaveCSS("transition-property", /\bscale\b/);
  }
  for (const link of await page.getByRole("navigation", { name: "Main" }).getByRole("link").filter({ visible: true }).all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test("reviews, help links and AutoDealer JSON-LD", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What customers say" })).toBeVisible();
  const main = page.getByRole("main");
  for (const [name, href] of [
    [/^Finance/, "/finance"],
    [/^Sell your car/, "/sell-your-car"],
    [/^Find a car/, "/find-a-car"],
  ] as const) {
    await expect(main.getByRole("link", { name })).toHaveAttribute("href", href);
  }
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const data = JSON.parse((await scripts.textContent())!);
  expect(data["@type"]).toBe("AutoDealer");
  expect(data).not.toHaveProperty("aggregateRating");
});

test("at 320px nothing scrolls sideways and the search field and button share a row", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const input = await page.getByRole("searchbox", { name: "Search make or model" }).boundingBox();
  const button = await page.getByRole("button", { name: "Search" }).boundingBox();
  expect(input!.y).toBe(button!.y);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the search still lands on used cars", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search make or model" }).fill(newest.make);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/used-cars\?q=/);
  });
});
