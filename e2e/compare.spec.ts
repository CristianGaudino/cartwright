import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// A tap before React attaches does nothing.
async function ready(page: Page) {
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
// The first n car pages from the list, in order. Compare lives on the car page; the cards carry only the heart.
async function carPaths(page: Page, n: number) {
  await page.goto("/used-cars");
  const hrefs = await page.locator("article h2 a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  return hrefs.slice(0, n);
}
async function compare(page: Page, path: string) {
  await page.goto(path);
  await ready(page);
  const button = page.getByTestId("buy-box").getByRole("button", { name: /^Compare / });
  await button.click();
  return button;
}
async function openCompare(page: Page, n: number) {
  const paths = await carPaths(page, n);
  for (const p of paths) await compare(page, p);
  await page.goto("/compare");
  await ready(page);
}
const cards = (page: Page) => page.getByTestId("compare-card");

test("a card has no compare button, only the heart", async ({ page }) => {
  await page.goto("/used-cars");
  const card = page.locator("article").first();
  await expect(card.getByRole("button", { name: /^Compare/ })).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Save / })).toHaveCount(1);
});

test("pick two cars on their pages: the compare page has a card each, and a place for a third", async ({ page }) => {
  const [a, b] = await carPaths(page, 2);
  await expect(await compare(page, a)).toHaveAttribute("aria-pressed", "true");
  await compare(page, b);
  const bar = page.getByRole("region", { name: "Compare cars" });
  await expect(bar).toContainText("2 of 3 to compare");
  await bar.getByRole("link", { name: "Compare" }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.getByRole("heading", { level: 1, name: "Compare cars" })).toBeVisible();
  await expect(cards(page)).toHaveCount(2);
  await expect(page.getByTestId("compare-placeholder")).toHaveCount(1);
  await expect(page.getByTestId("compare-placeholder")).toHaveAttribute("href", "/used-cars"); // the whole card is the link
  await expect(page.getByTestId("compare-placeholder")).toHaveText("Add a Car");
  await expect(page.getByRole("button", { name: "Add a car" })).toHaveCount(0); // no separate button
  for (const row of ["Price", "Year", "Mileage", "Fuel", "Transmission", "Engine", "Body type"]) await expect(cards(page).first().getByText(row, { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Compare cars" })).toHaveCount(0); // the bar is for the other pages
});

test("one car: its card and a placeholder to add the next, beside it and not a link underneath", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCompare(page, 1);
  await expect(cards(page)).toHaveCount(1);
  const placeholder = page.getByTestId("compare-placeholder");
  await expect(placeholder).toBeVisible();
  const card = (await cards(page).boundingBox())!;
  const slot = (await placeholder.boundingBox())!;
  expect(slot.x).toBeGreaterThan(card.x + card.width - 1); // to the right of it
  expect(Math.abs(slot.y - card.y)).toBeLessThan(2); // on the same row
  // Nothing to mark with one car.
  await expect(page.getByText(/^(Higher|Lower|Highest|Lowest)$/)).toHaveCount(0);
});

test("two cars: each row says which is higher and which is lower", async ({ page }) => {
  await openCompare(page, 2);
  const price = (i: number) => cards(page).nth(i).locator("dl > div").filter({ hasText: /^Price/ });
  const rows = [await price(0).textContent(), await price(1).textContent()];
  // Different prices: one card is Lower, the other Higher.
  expect(rows.filter((m) => m!.includes("Lower")).length).toBe(1);
  expect(rows.filter((m) => m!.includes("Higher")).length).toBe(1);
  // Lower is good news for a price, so its marker is green; Higher is red. The word and the arrow are there too, so colour is never the only sign.
  await expect(page.getByText("Lower", { exact: true }).first()).toHaveCSS("color", "rgb(74, 222, 128)");
  await expect(page.getByText("Higher", { exact: true }).first()).toHaveCSS("color", "rgb(249, 112, 102)");
});

test("remove a car with an Undo, and Clear all with an Undo, which puts the list back", async ({ page }) => {
  await openCompare(page, 2);
  await cards(page).first().getByRole("button", { name: /^Remove/ }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByTestId("toast")).toContainText("Removed");
  await page.getByTestId("toast").getByRole("button", { name: "Undo" }).click();
  await expect(cards(page)).toHaveCount(2);

  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByRole("heading", { name: "Nothing to compare yet" })).toBeVisible();
  await expect(page.getByTestId("toast")).toContainText("Compare list cleared");
  await page.getByTestId("toast").getByRole("button", { name: "Undo" }).click();
  await expect(cards(page)).toHaveCount(2);
});

test("Clear all is at the top, above the cards", async ({ page }) => {
  await openCompare(page, 2);
  const clear = (await page.getByRole("button", { name: "Clear all" }).boundingBox())!;
  const card = (await cards(page).first().boundingBox())!;
  expect(clear.y + clear.height).toBeLessThanOrEqual(card.y);
});

test("a fourth car is refused and said so, and the list stays at three", async ({ page }) => {
  const paths = await carPaths(page, 4);
  for (const p of paths.slice(0, 3)) await compare(page, p);
  const fourth = await compare(page, paths[3]);
  await expect(fourth).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("You can compare up to three cars.")).toBeAttached();
  await expect(page.getByRole("region", { name: "Compare cars" })).toContainText("3 of 3 to compare");
});

test("the compare page is empty to start with and not indexed", async ({ page }) => {
  await page.goto("/compare");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Nothing to compare yet" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("three cars: up, down and a dash for the one between, and symbols only on screen", async ({ page }) => {
  await openCompare(page, 3);
  await expect(cards(page)).toHaveCount(3);
  await expect(page.getByTestId("compare-placeholder")).toHaveCount(0); // full: no empty place
  const price = (i: number) => cards(page).nth(i).locator("dl > div").filter({ hasText: /^Price/ });
  const texts = [await price(0).textContent(), await price(1).textContent(), await price(2).textContent()];
  expect(texts.filter((t) => t!.includes("▲")).length).toBe(1); // highest
  expect(texts.filter((t) => t!.includes("▼")).length).toBe(1); // lowest
  expect(texts.filter((t) => t!.includes("Middle")).length).toBe(1); // the one between: a dash, and Middle for a screen reader
  // The marks are symbols: no Higher, Lower, Highest or Lowest is drawn. (Screen readers still get the word.)
  for (const word of ["Highest", "Lowest", "Middle"]) await expect(page.getByText(word, { exact: true }).first()).toHaveCSS("position", "absolute");
});

test("on a car page, Compare in the pill opens the list with that car in it", async ({ page }) => {
  const [a, b] = await carPaths(page, 2);
  await compare(page, a); // one car picked
  await page.goto(b); // looking at a different car
  await ready(page);
  const bar = page.getByRole("region", { name: "Compare cars" });
  await expect(bar).toContainText("1 of 3 to compare");
  await bar.getByRole("link", { name: "Compare" }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(cards(page)).toHaveCount(2); // the one picked, and the one that was open
  await expect(cards(page).nth(0).getByRole("heading").getByRole("link")).toHaveAttribute("href", b); // newest first
});

test("each compare card has swipeable photos, like a stock card", async ({ page }) => {
  await openCompare(page, 2);
  for (const card of await cards(page).all()) {
    const carousel = card.getByRole("group", { name: /^Photos of / });
    await expect(carousel).toBeVisible();
    await expect(carousel.getByRole("group", { name: /^Photo \d+ of / }).first()).toBeVisible();
    // The rest of the photos load after the card is near the screen; then there is more than one screen of them to swipe through.
    await expect.poll(() => carousel.evaluate((el) => el.scrollWidth > el.clientWidth * 2)).toBe(true);
  }
});

test.describe("desktop pointer", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("a compare card shows photo arrows on hover and the next one moves the photo", async ({ page }) => {
    await openCompare(page, 2);
    const card = cards(page).first();
    const carousel = card.getByRole("group", { name: /^Photos of / });
    await expect.poll(() => carousel.evaluate((el) => el.scrollWidth > el.clientWidth * 2)).toBe(true);
    await card.hover();
    const next = card.getByRole("button", { name: "Next photo" });
    await expect(next).toBeVisible();
    await expect(next).toHaveCSS("opacity", "1");
    await next.click();
    await expect.poll(() => carousel.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test("the compare pill and the undo toast share one shape", async ({ page }) => {
    const [a] = await carPaths(page, 1);
    await compare(page, a);
    await page.goto("/used-cars");
    const bar = page.getByRole("region", { name: "Compare cars" });
    const barRadius = await bar.evaluate((el) => getComputedStyle(el).borderRadius);
    await bar.getByRole("button", { name: "Clear" }).click();
    const toast = page.getByTestId("toast");
    await expect(toast).toBeVisible();
    expect(await toast.evaluate((el) => getComputedStyle(el).borderRadius)).toBe(barRadius);
  });
});
