import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { ready } from "./ready";

// A pressable's press and colour changes only animate while the shared base rule (globals.css) owns its transition: a transition utility
// on it would replace the rule and the press would snap.
const transitionProperty = (el: Locator) => el.evaluate((e) => getComputedStyle(e).transitionProperty);

const openFilters = async (page: Page) => {
  await page.goto("/used-cars");
  await ready(page);
  await page.getByRole("button", { name: /^Filters/ }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await expect(sheet).toBeVisible();
  return sheet;
};

test("a filter chip in the sheet animates its press and its fill", async ({ page }) => {
  const property = await transitionProperty((await openFilters(page)).locator("button[aria-pressed]").first());
  expect(property).toContain("scale");
  expect(property).toContain("background-color");
});

test("the heart on a car card animates its press and hover lift", async ({ page }) => {
  await page.goto("/used-cars");
  expect(await transitionProperty(page.getByRole("button", { name: /^Save / }).first())).toContain("filter");
});

test.describe("with reduced motion", () => {
  test.beforeEach(({ page }) => page.emulateMedia({ reducedMotion: "reduce" }));

  test("an .enter element only fades", async ({ page }) => {
    await page.goto("/");
    const property = await page.evaluate(() => {
      const el = document.createElement("div");
      el.className = "enter";
      document.body.append(el);
      return getComputedStyle(el).transitionProperty;
    });
    expect(property).toBe("opacity");
  });

  test("a filter group still fades open", async ({ page }) => {
    const group = (await openFilters(page)).locator("details").first();
    expect(await group.evaluate((e) => getComputedStyle(e, "::details-content").transitionProperty)).toContain("opacity");
  });
});
