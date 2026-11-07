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
  await expect(page.getByRole("heading", { level: 1, name: "Find your next car" })).toHaveCount(1);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  await page.getByLabel("Make", { exact: true }).selectOption({ label: newest.make });
  await page.getByRole("button", { name: "Search cars" }).click();
  await expect(page).toHaveURL(/\/used-cars\?/);
  expect(new URL(page.url()).searchParams.get("make")).toBe(newest.make.toLowerCase().replaceAll(" ", "-"));
});

test("picking a make narrows the model list, and the Find me a car tab links to the form page", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  const model = page.getByLabel("Model", { exact: true });
  const all = await model.locator("option").count();
  await page.getByLabel("Make", { exact: true }).selectOption({ label: newest.make });
  expect(await model.locator("option").count()).toBeLessThan(all);
  await page.getByRole("tab", { name: "Find me a car" }).click();
  await expect(page.getByRole("link", { name: "Ask us to find it" })).toHaveAttribute("href", "/find-a-car");
  await expect(page.getByLabel("Make", { exact: true })).toBeHidden();
});

test("on a phone the featured row has one dot per card", async ({ page }) => {
  await page.goto("/");
  const row = page.getByRole("group", { name: "Featured stock" });
  const cards = await row.locator("article").count();
  await expect(row.locator(':scope > div[aria-hidden="true"] > span')).toHaveCount(cards);
});

test("the search offers only makes that have a car in stock", async ({ page }) => {
  await page.goto("/");
  const offered = await page.getByLabel("Make", { exact: true }).locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
  const inStockMakes = new Set(inStock.map((c) => c.make.toLowerCase().replaceAll(" ", "-")));
  expect(offered.length).toBeGreaterThan(0);
  for (const make of offered) expect(inStockMakes.has(make), make).toBe(true);
});

test("featured stock: the newest in-stock cars and View all stock", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Featured stock" }) });
  const cards = section.locator("article");
  await expect(cards).toHaveCount(Math.min(6, inStock.length));
  await expect(cards.first().locator("a").first()).toHaveAttribute("href", `/used-cars/${newest.slug}`);
  await expect(section.getByRole("link", { name: "View all stock" })).toHaveAttribute("href", "/used-cars");
});

test.describe("desktop pointer", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("the featured row pages with its arrows, and the trust icons are all the same size", async ({ page }) => {
    await page.goto("/");
    const row = page.getByRole("group", { name: "Featured stock" });
    const next = row.getByRole("button", { name: "Next cars" });
    await expect(next).toBeVisible();
    await expect(row.getByRole("button", { name: "Previous cars" })).toHaveCSS("opacity", "0");
    await next.click();
    await expect(row.getByRole("button", { name: "Previous cars" })).toHaveCSS("opacity", "1");
    for (const icon of await page.getByRole("region", { name: "Why buy from us" }).locator("svg").all()) {
      const box = (await icon.boundingBox())!;
      expect([box.width, box.height]).toEqual([32, 32]);
    }
  });
});

// Tailwind's active:scale-* sets the scale property; a transition that only lists transform makes the press snap (#45).
test("press feedback eases scale, and header links are 44px tall", async ({ page }) => {
  await page.goto("/");
  for (const el of [page.locator("article").first(), page.getByRole("button", { name: "Search cars" }), page.getByRole("main").getByRole("link", { name: "Browse our stock" })]) {
    await expect(el).toHaveCSS("transition-property", /\bscale\b/);
  }
  for (const link of await page.getByRole("navigation", { name: "Main" }).getByRole("link").filter({ visible: true }).all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test("reviews, the trust strip and finance banner, and AutoDealer JSON-LD", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What customers say" })).toBeVisible();
  const main = page.getByRole("main");
  for (const [name, href] of [
    [/^Flexible finance/, "/finance"],
    [/^Trade-in welcome/, "/sell-your-car"],
    [/^Test drives/, "/used-cars"],
    ["Check finance options", "/finance"],
    ["Get a finance quote", "/finance"],
  ] as const) {
    await expect(main.getByRole("link", { name })).toHaveAttribute("href", href);
  }
  // The two warranty lines are unconfirmed, so the strip says so.
  await expect(page.getByRole("region", { name: "Why buy from us" }).getByText("Placeholder details")).toBeVisible();
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const data = JSON.parse((await scripts.textContent())!);
  expect(data["@type"]).toBe("AutoDealer");
  expect(data).not.toHaveProperty("aggregateRating");
});

test("at 320px nothing scrolls sideways and the search selects sit two to a row", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const make = await page.getByLabel("Make", { exact: true }).boundingBox();
  const model = await page.getByLabel("Model", { exact: true }).boundingBox();
  expect(make!.y).toBe(model!.y);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the search still lands on used cars", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Make", { exact: true }).selectOption({ label: newest.make });
    await page.getByRole("button", { name: "Search cars" }).click();
    await expect(page).toHaveURL(/\/used-cars\?.*make=/);
  });
});
