import { expect, test } from "@playwright/test";

const strip = (page: import("@playwright/test").Page) => page.getByRole("group", { name: "Google reviews" });

test("the home page shows five demo reviews, authored Sample customer and with no Demo label, with Google Maps attribution", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What customers say" })).toBeVisible();
  await expect(page.getByText("Demo reviews")).toHaveCount(0);
  await expect(page.getByText("Showing the most relevant reviews from Google Maps.")).toBeVisible();
  const cards = strip(page).locator("article");
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) {
    await expect(card).toContainText("Google Maps");
    const link = card.locator('a[href^="https://www.google.com/maps/"]');
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});

test("the aggregate rating, See all and the review policy link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Rated 4.8 out of 5 from 5 Google reviews")).toBeAttached();
  const all = page.getByRole("link", { name: "See all on Google Maps" });
  await expect(all).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=V92%20NT93%2C%20Ireland");
  await expect(all).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: /Google's review policy/ })).toHaveAttribute("href", "https://support.google.com/contributionpolicy/answer/7422880");
});

test("at 320px only the review strip scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const { scrollWidth, clientWidth } = await strip(page).locator("ul").evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
  expect(scrollWidth).toBeGreaterThan(clientWidth);
});

test("at 1280px four reviews show across", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const visible = await strip(page).locator("article").evaluateAll((els) => els.filter((e) => e.checkVisibility()).length);
  expect(visible).toBeGreaterThan(3); // more than three show at once
});
