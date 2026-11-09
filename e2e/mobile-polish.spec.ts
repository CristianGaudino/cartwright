import { expect, test } from "@playwright/test";

// The phone layout fixes from the mobile polish pass (#139 to #146). The default device is a phone.

test("contact on a phone: call, map, message form, then opening hours", async ({ page }) => {
  await page.route("https://maps.google.com/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.goto("/contact");
  const y = async (l: import("@playwright/test").Locator) => (await l.first().boundingBox())!.y;
  const call = await y(page.getByRole("link", { name: /^Call / }));
  const map = await y(page.locator("main iframe, main [data-map], main img").first());
  const form = await y(page.getByRole("heading", { name: "Send Us a Message" }));
  const hours = await y(page.getByRole("heading", { name: "Opening Hours" }));
  expect(call).toBeLessThan(map);
  expect(map).toBeLessThan(form);
  expect(form).toBeLessThan(hours);
});

test("the home search tabs share the width equally on a phone", async ({ page }) => {
  await page.goto("/");
  const [a, b] = await Promise.all([page.getByRole("tab", { name: "Search Stock" }).boundingBox(), page.getByRole("tab", { name: "Find Me a Car" }).boundingBox()]);
  expect(Math.abs(a!.width - b!.width)).toBeLessThan(2);
});

test("the footer is compact on a phone", async ({ page }) => {
  await page.goto("/");
  expect((await page.getByRole("contentinfo").boundingBox())!.height).toBeLessThan(620);
});

test("the used cars page ends with Back to Top, which scrolls to the top", async ({ page }) => {
  await page.goto("/used-cars");
  const button = page.getByRole("button", { name: "Back to Top" });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
});

test("the used cars page has the search above the car count on a phone", async ({ page }) => {
  await page.goto("/used-cars");
  const search = (await page.getByRole("searchbox", { name: "Search make or model" }).boundingBox())!;
  const count = (await page.getByTestId("count").boundingBox())!;
  expect(search.y).toBeLessThan(count.y);
});

test("every search field has a search icon", async ({ page }) => {
  await page.goto("/used-cars");
  const box = page.getByRole("searchbox", { name: "Search make or model" });
  await expect(box.locator("xpath=..").locator("svg")).toHaveCount(1);
});

test("the featured and similar cars rows have no arrows, count or dots on a phone, and no See all photos slide anywhere", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(page.getByText(/See all \d+ photos/)).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^(Previous|Next) / })).toBeHidden();
});

test("a phone carousel drifts, holds while a finger is on it and for a few seconds after, then drifts on", async ({ page }) => {
  await page.goto("/");
  const ul = page.getByRole("group", { name: "Featured stock" }).locator("ul").first();
  await ul.scrollIntoViewIfNeeded();
  const left = () => ul.evaluate((e) => e.scrollLeft);
  const touch = (type: string) => ul.evaluate((e, t) => e.dispatchEvent(new PointerEvent(t, { pointerType: "touch", bubbles: true })), type);
  await expect.poll(left).toBeGreaterThan(20); // it drifts by itself
  await touch("pointerdown");
  const held = await left();
  await page.waitForTimeout(1200);
  expect(Math.abs((await left()) - held)).toBeLessThan(3); // held while the finger is down
  await touch("pointerup");
  await page.waitForTimeout(1500);
  expect(Math.abs((await left()) - held)).toBeLessThan(3); // and for a few seconds after
  await expect.poll(left, { timeout: 8000 }).toBeGreaterThan(held + 10); // then it goes on, instead of stopping for good
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("the trust banner has a vertical bar between every pair of its five boxes", async ({ page }) => {
    await page.goto("/");
    const cells = page.getByRole("region", { name: "Why buy from us" }).getByRole("listitem");
    expect(await cells.count()).toBe(5);
    const bars = await cells.evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).borderRightWidth) + parseFloat(getComputedStyle(el).borderLeftWidth)));
    // Each box but the last has a bar on its right (divide-x). The 1st and 3rd once lost theirs to a leftover tablet rule.
    expect(bars.slice(0, 4).every((w) => w > 0)).toBe(true);
  });

  test("Get Directions on the About page is as wide as the photo above it", async ({ page }) => {
    await page.goto("/about");
    const button = (await page.getByRole("link", { name: /Get directions/i }).boundingBox())!;
    const photo = (await page.locator("main img").first().boundingBox())!;
    expect(Math.abs(button.width - photo.width)).toBeLessThan(2);
  });
});
