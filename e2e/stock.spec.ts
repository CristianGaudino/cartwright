import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const PER_PAGE = 12;
const digits = (s: string | null) => Number((s ?? "").replace(/\D/g, ""));

async function total(page: Page) {
  const text = (await page.getByTestId("count").textContent()) ?? "";
  expect(text).toMatch(/^(No cars|1 car|\d+ cars)$/);
  return text === "No cars" ? 0 : digits(text) || 1;
}

const prices = (page: Page) => page.locator("article [data-price]").allTextContents().then((l) => l.map(digits));

test("lists the cars, price first, 12 per page", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(page.getByRole("heading", { level: 1, name: "Quality used cars" })).toBeVisible();
  const n = await total(page);
  await expect(page.locator("article")).toHaveCount(Math.min(PER_PAGE, n));
  for (const p of await page.locator("article [data-price]").allTextContents()) expect(p).toMatch(/^€[\d,]+$/);
});

test("sort and page come from the URL", async ({ page }) => {
  await page.goto("/used-cars?sort=price-asc");
  const asc = await prices(page);
  expect(asc).toEqual([...asc].sort((a, b) => a - b));
  await page.goto("/used-cars?sort=price-desc");
  const desc = await prices(page);
  expect(desc).toEqual([...desc].sort((a, b) => b - a));

  await page.goto("/used-cars");
  const n = await total(page);
  if (n > PER_PAGE) {
    await page.goto("/used-cars?page=2");
    await expect(page.getByText(`Page 2 of ${Math.ceil(n / PER_PAGE)}`)).toBeVisible();
  }
});

test("unknown params and bad values are ignored", async ({ page, request }) => {
  await page.goto("/used-cars");
  const n = await total(page);
  const res = await request.get("/used-cars?sort=bogus&yearFrom=abc&make=%3Cscript%3E&foo=bar");
  expect(res.status()).toBe(200);
  await page.goto("/used-cars?sort=bogus&yearFrom=abc&make=%3Cscript%3E&foo=bar");
  expect(await total(page)).toBe(n);
});

test("header: logo, one link, scrolls away", async ({ page }) => {
  await page.goto("/used-cars");
  const header = page.getByRole("banner");
  await expect(header.getByRole("img", { name: "Carright" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Used cars" })).toHaveAttribute("href", "/used-cars");
  expect(await header.evaluate((el) => getComputedStyle(el).position)).toMatch(/^(static|relative)$/);
});

test("every card links to a real car page, unknown slugs 404", async ({ page, request }) => {
  await page.goto("/used-cars");
  const n = await total(page);
  for (let p = 1; p <= Math.ceil(n / PER_PAGE); p++) {
    await page.goto(`/used-cars?page=${p}`);
    for (const href of await page.locator("article h2 a").evaluateAll((a) => a.map((x) => x.getAttribute("href")))) {
      expect(href).toMatch(/^\/used-cars\/[a-z0-9-]+$/);
      expect((await request.get(href!)).status(), href!).toBe(200);
    }
  }
  expect((await request.get("/used-cars/not-a-car")).status()).toBe(404);
});

test("a car page shows title, price and a way back", async ({ page }) => {
  await page.goto("/used-cars");
  await page.locator("article h2 a").first().click();
  await expect(page).toHaveURL(/\/used-cars\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("buy-box").getByText(/^€[\d,]+$/).filter({ visible: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to used cars" }).click();
  await expect(page).toHaveURL(/\/used-cars$/);
});

test.describe("320px wide", () => {
  test.use({ viewport: { width: 320, height: 640 } });
  test("no sideways scroll on the stock page or a car page", async ({ page }) => {
    for (const path of ["/used-cars", null]) {
      if (path) await page.goto(path);
      else {
        await page.locator("article h2 a").first().click();
        await expect(page).toHaveURL(/\/used-cars\/[a-z0-9-]+$/);
      }
      await page.waitForLoadState("load");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    }
  });
});

declare global {
  interface Window {
    __skeletonSeen: boolean;
    __busySeen: boolean;
  }
}

test("sort replaces the URL and dims the old results, never a skeleton", async ({ page }) => {
  await page.goto("/used-cars");
  await page.waitForLoadState("load");
  await expect(page.locator("[data-skeleton]")).toHaveCount(0); // the first-load skeleton lingers briefly after load; only a change must never show it
  const historyBefore = await page.evaluate(() => history.length);
  // Sample the whole change: a check after it would miss the pending state.
  await page.evaluate(() => {
    window.__skeletonSeen = !!document.querySelector("[data-skeleton]");
    window.__busySeen = false;
    new MutationObserver(() => {
      if (document.querySelector("[data-skeleton]")) window.__skeletonSeen = true;
      if (document.querySelector('[aria-busy="true"].opacity-60')) window.__busySeen = true;
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  });
  expect(await page.evaluate(() => window.__skeletonSeen)).toBe(false);

  await page.locator("select:visible").selectOption({ label: "Price: low to high" });
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect.poll(async () => {
    const p = await prices(page);
    return p.every((x, i) => i === 0 || p[i - 1] <= x);
  }).toBe(true);

  expect(await page.evaluate(() => history.length)).toBe(historyBefore);
  expect(await page.evaluate(() => window.__skeletonSeen)).toBe(false);
  expect(await page.evaluate(() => window.__busySeen)).toBe(true);
});

test("the count is live, the filter bar sticks and the header does not", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(page.getByTestId("count")).toHaveAttribute("aria-live", "polite");
  expect(await page.getByTestId("sticky-bar").evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
  expect(await page.getByRole("banner").evaluate((el) => getComputedStyle(el).position)).not.toBe("sticky");
});

test("a copied URL shows the same cars in a new context", async ({ page, browser }) => {
  await page.goto("/used-cars");
  const n = await total(page);
  const url = `/used-cars?sort=price-asc${n > PER_PAGE ? "&page=2" : ""}`;
  await page.goto(url);
  const titles = await page.locator("article h2").allTextContents();
  const ctx = await browser.newContext({ baseURL: page.url().replace(/\/used-cars.*/, "") });
  const other = await ctx.newPage();
  await other.goto(url);
  expect(await other.locator("article h2").allTextContents()).toEqual(titles);
  await ctx.close();
});

test.describe("one result, on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });
  test("one normal-width card and no pagination", async ({ page }) => {
    await page.goto("/used-cars?sort=price-desc");
    const top = (await prices(page))[0];
    await page.goto(`/used-cars?priceMin=${top}`);
    const k = await page.locator("article").count();
    expect(k).toBeGreaterThanOrEqual(1);
    expect(k).toBeLessThanOrEqual(PER_PAGE);
    await expect(page.getByTestId("count")).toHaveText(k === 1 ? "1 car" : `${k} cars`);
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
    const card = (await page.locator("article").first().boundingBox())!;
    const grid = (await page.locator("article").first().locator("..").boundingBox())!;
    expect(card.width).toBeLessThan(grid.width / 2);
  });
});

test("a provider failure shows the error state and Sort still works", async ({ page, request }) => {
  test.skip(!!process.env.E2E_BASE_URL, "needs the failure switch, which only the local server has");
  const url = "/used-cars?q=e2e-forced-failure";
  expect((await request.get(url)).status()).toBe(200);
  await page.goto(url);
  const error = () => Promise.all([
    expect(page.getByRole("heading", { name: "We could not load the cars" })).toBeVisible(),
    expect(page.getByText("Check your connection and try again.")).toBeVisible(),
    expect(page.getByRole("button", { name: "Try loading cars again" })).toBeVisible(),
  ]);
  await error();
  await expect(page.locator("article")).toHaveCount(0);
  await expect(page.getByTestId("count")).toBeEmpty();

  const sort = page.getByRole("combobox", { name: "Sort" });
  await expect(sort).toBeEnabled();
  await sort.selectOption({ label: "Price: low to high" });
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page).toHaveURL(/q=e2e-forced-failure/);
  await error();

  await page.getByRole("button", { name: "Try loading cars again" }).click();
  await error();
  await expect(sort).toBeEnabled();

  await page.goto("/used-cars?sort=price-asc");
  await expect(page.locator("article").first()).toBeVisible();
});

test("a page past the end lands on the last page", async ({ page }) => {
  await page.goto("/used-cars");
  const last = Math.ceil((await total(page)) / PER_PAGE);
  await page.goto("/used-cars?page=999");
  await expect(page).toHaveURL(last > 1 ? new RegExp(`page=${last}$`) : /\/used-cars$/);
  await expect(page.locator("article").first()).toBeVisible();
});

test("zero matches show the empty state and Clear all filters brings the cars back", async ({ page }) => {
  await page.goto("/used-cars?make=zzzz");
  await expect(page.getByRole("heading", { name: "No cars match these filters" })).toBeVisible();
  await expect(page.getByText("Try removing a filter.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cannot find it? Ask us to find it for you." })).toHaveAttribute("href", "/find-a-car");
  await expect(page.locator("article")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page).toHaveURL(/\/used-cars$/);
  await expect(page.locator("article").first()).toBeVisible();
});

test.describe("list and grid, on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("the toggle switches to wide cards, and the choice is remembered", async ({ page }) => {
    await page.goto("/used-cars");
    await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
    const card = page.locator("article").first();
    const grid = await card.boundingBox();
    await expect(page.getByRole("button", { name: "Grid view" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await card.boundingBox())!.width).toBeGreaterThan(grid!.width * 2);
    await page.reload();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Grid view" }).click();
    await expect.poll(async () => (await card.boundingBox())!.width).toBeLessThan(grid!.width + 2);
  });

  test("the filter panel has a heading and Clear all, which empties the filters", async ({ page }) => {
    await page.goto("/used-cars?fuel=diesel");
    const panel = page.locator("aside");
    await expect(panel.getByRole("heading", { name: "Filter & refine" })).toBeVisible();
    await panel.getByRole("button", { name: "Clear all" }).click();
    await expect(page).toHaveURL(/\/used-cars$/);
  });
});
