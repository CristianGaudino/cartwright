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
  await expect(page.getByRole("link", { name: /Google's Review Policy/ })).toHaveAttribute("href", "https://support.google.com/contributionpolicy/answer/7422880");
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

test.describe("desktop pointer", () => {
  test.use({ viewport: { width: 900, height: 900 }, isMobile: false, hasTouch: false }); // two across, so three pages

  test("the dots and arrows move the reviews row", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
    const row = strip(page).locator(":scope > ul");
    const at = () => row.evaluate((el) => el.scrollLeft);
    await strip(page).scrollIntoViewIfNeeded();
    const dot = strip(page).getByRole("button", { name: /^Go to page 2 of / });
    await dot.click();
    await expect.poll(at).toBeGreaterThan(0);
    await expect(dot).toHaveAttribute("aria-current", "true");
    await strip(page).getByRole("button", { name: "Previous reviews" }).click();
    await expect.poll(at).toBe(0);
    await strip(page).getByRole("button", { name: "Next reviews" }).click();
    await expect.poll(at).toBeGreaterThan(0);
  });
});

// Next reaches the last card at every width with arrows: five reviews four across overflow by a quarter of a screen, and are two pages.
for (const width of [900, 1280]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, isMobile: false, hasTouch: false });

    test("the reviews row has no Pause, and Next reaches the fifth review", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("/");
      await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
      await strip(page).scrollIntoViewIfNeeded();
      await expect(strip(page).getByRole("button", { name: /^(Pause|Play) / })).toHaveCount(0);
      const next = strip(page).getByRole("button", { name: "Next reviews" });
      const pages = await strip(page).getByRole("button", { name: /^Go to page / }).count();
      for (let i = 1; i < pages; i++) {
        await next.click();
        await expect(strip(page).getByRole("button", { name: `Go to page ${i + 1} of ${pages}` })).toHaveAttribute("aria-current", "true");
      }
      await expect(strip(page).locator("article").nth(4)).toBeInViewport({ ratio: 1 });
      await expect(next).toHaveCSS("opacity", "0.3");
    });
  });
}
