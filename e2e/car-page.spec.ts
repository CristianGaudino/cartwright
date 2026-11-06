import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";

type Demo = { slug: string; make: string; makeSlug: string; year: number; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const soldInPeriod = cars.find((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > Date.now());
const SKIP = "No demo car is inside the sold window: run npm run stock:build to refresh the demo dates";

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

test("an unknown slug is a real 404", async ({ request }) => {
  expect((await request.get("/used-cars/not-a-car")).status()).toBe(404);
});
