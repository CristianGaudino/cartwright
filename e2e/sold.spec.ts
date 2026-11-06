import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";

type Demo = { makeSlug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const now = Date.now();
const inPeriod = cars.filter((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > now);
// A make that has both cars to buy and a sold car in the window, so the order check has something on each side.
const mixedMake = inPeriod.find((s) => cars.some((c) => c.makeSlug === s.makeSlug && !c.soldAt))?.makeSlug;

const digits = (s: string | null) => Number((s ?? "").replace(/\D/g, ""));
const countText = (n: number) => (n === 0 ? "No cars" : n === 1 ? "1 car" : `${n} cars`);
const SKIP = "No demo car is inside the sold window: run npm run stock:build to refresh the demo dates";

// A click before React attaches does nothing on a touch device.
async function open(page: Page, url = "/used-cars") {
  await page.goto(url);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const prices = (page: Page) => page.locator("article > div:last-child > p:first-child").allTextContents();
const soldBox = (page: Page) => page.getByRole("checkbox", { name: "Include sold cars" });
const chip = (page: Page) => page.getByRole("button", { name: "Remove Sold cars included" });

test("by default no card reads Sold", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(page.locator("article").first()).toBeVisible();
  expect(await prices(page)).not.toContain("Sold");
});

test("a sold value other than 1 is ignored", async ({ page }) => {
  await page.goto("/used-cars");
  const all = await page.getByTestId("count").textContent();
  await page.goto("/used-cars?sold=yes");
  await expect(page.getByTestId("count")).toHaveText(all!);
  await expect(chip(page)).toHaveCount(0);
});

test.describe("sold cars", () => {
  test.skip(inPeriod.length === 0, SKIP);

  test.describe("on a desktop", () => {
    test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

    test("the sidebar checkbox puts sold=1 in the URL, adds the chip and the sold cars to the count", async ({ page }) => {
      await open(page);
      const before = digits(await page.getByTestId("count").textContent());
      await expect(soldBox(page)).not.toBeChecked();
      await soldBox(page).check();
      await expect(page).toHaveURL(/sold=1$/);
      await expect(chip(page)).toBeVisible();
      await expect(page.getByTestId("count")).toHaveText(countText(before + inPeriod.length));
    });

    test("the chip and Clear all filters each remove sold=1", async ({ page }) => {
      await open(page, "/used-cars?sold=1");
      await expect(soldBox(page)).toBeChecked();
      await chip(page).click();
      await expect(page).toHaveURL(/\/used-cars$/);
      await expect(soldBox(page)).not.toBeChecked();

      await soldBox(page).check();
      await expect(page).toHaveURL(/sold=1$/);
      await page.getByRole("button", { name: "Clear all filters" }).click();
      await expect(page).toHaveURL(/\/used-cars$/);
      await expect(soldBox(page)).not.toBeChecked();
    });

    test("sold cars list after every car in stock, each priced Sold", async ({ page }) => {
      test.skip(!mixedMake, "No make has both a car in stock and a sold car in the window");
      await open(page, `/used-cars?sold=1&make=${mixedMake}`);
      const lines = await prices(page);
      const sold = lines.filter((l) => l === "Sold").length;
      expect(sold).toBe(inPeriod.filter((c) => c.makeSlug === mixedMake).length);
      expect(lines.length - sold).toBe(cars.filter((c) => c.makeSlug === mixedMake && !c.soldAt).length);
      expect(lines.slice(lines.length - sold).every((l) => l === "Sold")).toBe(true);
      expect(lines.slice(0, lines.length - sold).every((l) => /^€[\d,]+$/.test(l))).toBe(true);
    });
  });

  test.describe("sold card", () => {
    test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

    test("a Sold badge on the photo, the same price line height, no dimming", async ({ page }) => {
      test.skip(!mixedMake, "No make has both a car in stock and a sold car in the window");
      await open(page, `/used-cars?sold=1&make=${mixedMake}`);
      const price = (text: RegExp) => page.locator("article > div:last-child > p:first-child").filter({ hasText: text }).first();
      const card = page.locator("article").filter({ has: page.locator("p", { hasText: /^Sold$/ }) }).first();
      await card.scrollIntoViewIfNeeded();

      const badge = card.locator("> div").first().getByText("Sold", { exact: true });
      await expect(badge).toBeVisible();
      await expect(badge).toHaveAttribute("aria-hidden", "true");
      await expect(badge).toHaveCSS("background-color", "rgb(245, 245, 247)");

      expect((await price(/^Sold$/).boundingBox())!.height).toBe((await price(/^€/).boundingBox())!.height);

      await expect(card).toHaveCSS("opacity", "1");
      await expect(card).toHaveCSS("filter", "none");
      const photo = card.locator("img").first();
      await expect(photo).toHaveAttribute("data-loaded", "");
      await expect(photo).toHaveCSS("opacity", "1");
      await expect(photo).toHaveCSS("filter", "none");
    });
  });

  test("on a phone the checkbox is in the sheet and the Filters badge counts it", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: /^Filters/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("checkbox", { name: "Include sold cars" }).check();
    await expect(page).toHaveURL(/sold=1$/);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(page.getByTestId("filter-badge")).toHaveText("1");
  });
});
