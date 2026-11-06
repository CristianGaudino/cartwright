import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";

type Demo = { id: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;
const soldInPeriod = cars.find((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > Date.now());
const SKIP = "No demo car is inside the sold window: run npm run stock:redate to refresh the demo dates";
const UNKNOWN = "999999999999";
const KEY = "cartwright:saved-ids";

// Seeds the saved list before the first load only, so a reload sees what the page left behind.
const seed = (page: Page, ids: string[]) =>
  page.addInitScript(
    ([key, value]) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    [KEY, JSON.stringify(ids)],
  );
const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as string[], KEY);

const savedLink = (page: Page) => page.getByRole("banner").getByRole("link", { name: /^Saved cars/ });
const firstHeart = (page: Page) => page.locator("article").first().getByRole("button", { name: /^Save / });

test("a heart saves a car without leaving the page and the count survives a reload", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars");
  const url = page.url();

  await firstHeart(page).click();
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "true");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  expect(page.url()).toBe(url);

  const stored = await page.evaluate(() => localStorage.getItem("cartwright:saved-ids"));
  const ids = JSON.parse(stored!) as unknown[];
  expect(ids).toHaveLength(1);
  for (const id of ids) expect(id).toMatch(/^\d{1,12}$/);

  await page.reload();
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "true");

  await firstHeart(page).click();
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "false");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars");
});

test("the Saved link is the same width before hydration and with a count", async ({ page, browser }) => {
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const raw = await noJs.newPage();
  await raw.goto("/used-cars");
  const before = (await savedLink(raw).boundingBox())!.width;
  await noJs.close();

  await page.goto("/used-cars");
  await firstHeart(page).click();
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  expect((await savedLink(page).boundingBox())!.width).toBe(before);
});

test("saving in one tab updates another tab without a reload", async ({ context }) => {
  const [a, b] = [await context.newPage(), await context.newPage()];
  await a.goto("/used-cars");
  await b.goto("/used-cars");
  await expect(savedLink(b)).toHaveAccessibleName("Saved cars");

  await firstHeart(a).click();
  await expect(savedLink(b)).toHaveAccessibleName("Saved cars, 1");
  await expect(firstHeart(b)).toHaveAttribute("aria-pressed", "true");
});

test("saving and unsaving are announced", async ({ page }) => {
  await page.goto("/used-cars");
  const live = page.locator("article").first().locator('[aria-live="polite"]');
  await firstHeart(page).click();
  await expect(live).toHaveText("Saved");
  await firstHeart(page).click();
  await expect(live).toHaveText("Removed from saved");
});

test("with storage blocked a heart still toggles and nothing errors", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (e) => errors.push(e));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked", "QuotaExceededError");
    };
  });
  await page.goto("/used-cars");
  await firstHeart(page).click();
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "true");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  await firstHeart(page).click();
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

const titles = (page: Page) => page.locator("article h2").allTextContents();

test("/saved lists the saved cars newest first, after the browser is closed and reopened, and is noindex", async ({ page, browser }) => {
  await page.goto("/used-cars");
  const [first, second] = await titles(page);
  await firstHeart(page).click();
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  await page.locator("article").nth(1).getByRole("button", { name: /^Save / }).click();
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 2");

  await savedLink(page).click();
  await expect(page).toHaveURL(/\/saved$/);
  await expect(page.getByRole("heading", { level: 1, name: "Saved cars" })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(2);
  expect(await titles(page)).toEqual([second, first]);
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);

  const reopened = await browser.newContext({ storageState: await page.context().storageState() });
  const again = await reopened.newPage();
  await again.goto("/saved");
  await expect(again.locator("article")).toHaveCount(2);
  expect(await titles(again)).toEqual([second, first]);
  await reopened.close();
});

test("a saved car that is gone is pruned with a one-time note", async ({ page }) => {
  await seed(page, [UNKNOWN, live.id]);
  await page.goto("/saved");
  await expect(page.getByRole("status")).toHaveText("1 saved car is no longer available. We removed it from your list.");
  await expect(page.locator("article")).toHaveCount(1);
  expect(await stored(page)).toEqual([live.id]);
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");

  await page.reload();
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByText("no longer available")).toHaveCount(0);
});

test("when every saved car is gone, the note shows above the empty state", async ({ page }) => {
  await seed(page, [UNKNOWN, "999999999998"]);
  await page.goto("/saved");
  await expect(page.getByRole("status")).toHaveText("2 saved cars are no longer available. We removed them from your list.");
  await expect(page.getByRole("heading", { name: "No saved cars yet" })).toBeVisible();
});

test("a saved car sold inside the window stays with the Sold badge", async ({ page }) => {
  test.skip(!soldInPeriod, SKIP);
  await seed(page, [soldInPeriod!.id]);
  await page.goto("/saved");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article > div:last-child > p:first-child")).toHaveText("Sold");
  expect(await stored(page)).toEqual([soldInPeriod!.id]);
});

test("with nothing saved, /saved says so and links to the cars", async ({ page }) => {
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "No saved cars yet" })).toBeVisible();
  await expect(page.getByText("Tap the heart on any car to save it here.")).toBeVisible();
  await expect(page.getByRole("link", { name: "See used cars" })).toHaveAttribute("href", "/used-cars");
  await expect(page.locator("[data-skeleton]")).toHaveCount(0);
});

test("if the cars cannot be loaded, nothing is pruned and Try again loads them", async ({ page }) => {
  await seed(page, [UNKNOWN, live.id]);
  await page.route("**/api/saved-cars**", (r) => r.fulfill({ status: 500, body: "" }));
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "We could not load the cars" })).toBeVisible();
  await expect(page.getByText("Check your connection and try again.")).toBeVisible();
  expect(await stored(page)).toEqual([UNKNOWN, live.id]);

  await page.unroute("**/api/saved-cars**");
  await page.getByRole("button", { name: "Try loading cars again" }).click();
  await expect(page.locator("article")).toHaveCount(1);
});

test("unsaving on /saved keeps the card until the next visit and drops the count at once", async ({ page }) => {
  await seed(page, [live.id]);
  await page.goto("/saved");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  await firstHeart(page).click();
  await expect(firstHeart(page)).toHaveAttribute("aria-pressed", "false");
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars");
  await expect(page.locator("article")).toHaveCount(1);

  await firstHeart(page).click();
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  await firstHeart(page).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "No saved cars yet" })).toBeVisible();
});

test("at 320px the header fits without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/used-cars");
  await firstHeart(page).click();
  await expect(savedLink(page)).toHaveAccessibleName("Saved cars, 1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
