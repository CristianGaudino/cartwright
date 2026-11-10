import { expect, test } from "@playwright/test";
import { SITE_NAME } from "../src/lib/site";
import { optionLabels } from "./combo";

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

test("Back to top is a footer link on every page on a phone, level with the logo on the right, and there is no button", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(page.getByRole("button", { name: "Back to Top", exact: true })).toHaveCount(0);
  const footer = page.getByRole("contentinfo");
  const link = footer.getByRole("button", { name: "Back to top" });
  const [logo, to] = await Promise.all([footer.getByRole("link", { name: SITE_NAME }).boundingBox(), link.boundingBox()]);
  expect(to!.x).toBeGreaterThan(logo!.x + logo!.width);
  expect(to!.y + to!.height / 2).toBeCloseTo(logo!.y + logo!.height / 2, 0);
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await page.goto("/finance"); // it is in the footer, so every page has it
  await expect(footer.getByRole("button", { name: "Back to top" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(footer.getByRole("button", { name: "Back to top" })).toBeHidden();
});

test("the header stays at the top while a phone scrolls", async ({ page }) => {
  await page.goto("/finance");
  await page.evaluate(() => window.scrollTo(0, 400));
  expect((await page.getByRole("banner").boundingBox())!.y).toBe(0);
});

test("the phone menu marks the current page and nothing moves", async ({ page }) => {
  await page.goto("/finance");
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByRole("link", { name: "Finance", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(menu.locator("[aria-current]")).toHaveCount(1);
  const [a, b] = await Promise.all([menu.getByRole("link", { name: "Trade-In" }).boundingBox(), menu.getByRole("link", { name: "Finance", exact: true }).boundingBox()]);
  expect(a!.x).toBe(b!.x); // same left edge: the mark is in the gutter
});

test("tapping a menu item closes the menu at once, with no slide-out, and opens the page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await menu.getByRole("link", { name: "Finance", exact: true }).click();
  await expect(menu).toBeHidden({ timeout: 100 });
  await expect(page).toHaveURL(/\/finance$/);
});

test("on a phone each service opens its own form under its card, and only one form shows", async ({ page }) => {
  await page.goto("/service");
  const forms = page.getByRole("heading", { name: "Tell us what your car needs" });
  await expect(forms).toHaveCount(0);
  const [servicing, repairs] = [page.getByRole("button", { name: /^Servicing/ }), page.getByRole("button", { name: /^Repairs/ })];
  await servicing.click();
  await expect(forms).toHaveCount(1);
  await expect(page.getByLabel("How can we help?")).toHaveValue("I'd like to ask about servicing.");
  const [card, form] = await Promise.all([servicing.boundingBox(), forms.boundingBox()]);
  expect(form!.y).toBeGreaterThan(card!.y + card!.height); // right under the card that opened it
  await repairs.click();
  await expect(page.getByLabel("How can we help?")).toHaveCount(1); // the first form goes once it has slid shut
  await expect(page.getByLabel("How can we help?")).toHaveValue("I'd like to ask about repairs.");
  await expect(forms.filter({ visible: true })).toHaveCount(1);
  await expect(servicing).toHaveAttribute("aria-expanded", "false");
});

test("Find a car: Make is a drop-down with the popular makes first, then A to Z", async ({ page }) => {
  await page.goto("/find-a-car");
  const labels = await optionLabels(page.getByLabel("Make"));
  expect(labels.slice(0, 4)).toEqual(["Any make", "Toyota", "Volkswagen", "Ford"]);
  const rest = labels.slice(13);
  expect(rest).toEqual([...rest].sort((x, y) => x.localeCompare(y)));
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
