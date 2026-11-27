import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { ready } from "./ready";

// The undo toast: for actions that throw something away.
const heart = (page: Page) => page.locator("article").first().getByRole("button", { name: /^Save / });

test("un-saving a car shows a toast, and Undo saves it again", async ({ page }) => {
  await page.goto("/used-cars");
  await ready(page);
  await heart(page).click();
  await expect(heart(page)).toHaveAttribute("aria-pressed", "true");
  await heart(page).click();
  await expect(heart(page)).toHaveAttribute("aria-pressed", "false");
  const toast = page.getByTestId("toast");
  await expect(toast).toContainText("Removed from saved");
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(heart(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("banner").getByRole("link", { name: "Saved cars, 1" })).toBeVisible();
  await expect(toast.getByRole("button", { name: "Undo" })).toHaveCount(0); // gone once used
});

test("the toast goes by itself after six seconds, stays while it is hovered, and can be dismissed", async ({ page }) => {
  await page.clock.install();
  await page.goto("/used-cars");
  await ready(page);
  await heart(page).click();
  await heart(page).click();
  const toast = page.getByTestId("toast");
  await expect(toast).toContainText("Removed from saved");
  await toast.getByRole("button", { name: "Undo" }).hover();
  await page.clock.runFor(8000);
  await expect(toast).toContainText("Removed from saved"); // held while the pointer is on it
  await page.mouse.move(0, 0);
  await page.clock.runFor(6500);
  await expect(toast).toHaveCount(0);

  await heart(page).click();
  await heart(page).click();
  await toast.getByRole("button", { name: "Dismiss" }).click();
  await expect(toast).toHaveCount(0);
});

test("the toast sits above the compare pill and does not cover it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/used-cars");
  await ready(page);
  const href = (await page.locator("article h2 a").first().getAttribute("href"))!;
  await page.goto(href);
  await ready(page);
  const button = page.getByTestId("buy-box").getByRole("button", { name: /^Compare / });
  await button.click();
  const bar = page.getByRole("region", { name: "Compare cars" });
  await expect(bar).toBeVisible();
  await button.click(); // off again: a toast
  await expect(page.getByTestId("toast")).toContainText("Removed from compare");
  await button.click(); // on again: the pill is back, and the toast is still up
  await expect(bar).toBeVisible();
  const pill = (await bar.boundingBox())!;
  const toast = (await page.getByTestId("toast").boundingBox())!;
  expect(toast.y + toast.height).toBeLessThanOrEqual(pill.y + 1);
});

test("a toast removed under the pointer does not freeze the next one", async ({ page }) => {
  await page.clock.install();
  await page.goto("/used-cars");
  await ready(page);
  await heart(page).click();
  await heart(page).click();
  const toast = page.getByTestId("toast");
  await toast.getByRole("button", { name: "Undo" }).hover();
  await toast.getByRole("button", { name: "Undo" }).click(); // gone while the pointer is on it
  await heart(page).click();
  await expect(toast).toContainText("Removed from saved");
  await page.mouse.move(0, 0);
  await page.clock.runFor(7000);
  await expect(toast).toHaveCount(0);
});

test("Undo puts back the car that was removed and keeps a car saved since", async ({ page }) => {
  await page.goto("/used-cars");
  await ready(page);
  const second = page.locator("article").nth(1).getByRole("button", { name: /^Save / });
  await heart(page).click();
  await heart(page).click(); // removed: the toast is up
  await second.click(); // another car saved while it is
  await expect(page.getByRole("banner").getByRole("link", { name: "Saved cars, 1" })).toBeVisible();
  await page.getByTestId("toast").getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("banner").getByRole("link", { name: "Saved cars, 2" })).toBeVisible();
  await expect(heart(page)).toHaveAttribute("aria-pressed", "true");
  await expect(second).toHaveAttribute("aria-pressed", "true");
});

test("Dismiss fades the toast out in under 200ms, then it is gone", async ({ page }) => {
  await page.goto("/used-cars");
  await ready(page);
  await heart(page).click();
  await heart(page).click();
  const toast = page.getByTestId("toast");
  await expect(toast).toContainText("Removed from saved");
  await expect.poll(() => toast.evaluate((el) => el.getAnimations().length)).toBe(0); // the rise in is over
  const running = await toast.evaluate((el) => {
    (el.querySelector("button[aria-label='Dismiss']") as HTMLButtonElement).click();
    const a = el.getAnimations().find((x) => x.playState === "running");
    return a ? Number(a.effect?.getComputedTiming().duration) : 0;
  });
  expect(running).toBeGreaterThan(0); // still on screen, fading
  expect(running).toBeLessThan(200);
  await expect(toast).toHaveCount(0);
});

test("a new toast that comes while the old one fades out stays up", async ({ page }) => {
  await page.goto("/used-cars");
  await ready(page);
  await page.goto((await page.locator("article h2 a").first().getAttribute("href"))!);
  await ready(page);
  const box = page.getByTestId("buy-box");
  const compare = box.getByRole("button", { name: /^Compare / });
  await compare.click();
  await compare.click(); // off again: the first toast
  const toast = page.getByTestId("toast");
  await expect(toast).toContainText("Removed from compare");
  // In one task, so the first toast's 150ms fade is surely still running when the next one comes.
  await box.evaluate((el) => {
    (document.querySelector("[data-testid=toast] button[aria-label='Dismiss']") as HTMLButtonElement).click();
    const save = el.querySelector("button[aria-label='Save This Car']") as HTMLButtonElement;
    save.click();
    save.click(); // saved and removed: a different toast
  });
  await page.waitForTimeout(400); // well past the old fade, which must not take the new toast with it
  await expect(toast).toHaveCount(1);
  await expect(toast).toContainText("Removed from saved");
});

test("with reduced motion the toast and the compare pill still fade in", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/used-cars");
  await ready(page);
  await page.goto((await page.locator("article h2 a").first().getAttribute("href"))!);
  await ready(page);
  const button = page.getByTestId("buy-box").getByRole("button", { name: /^Compare / });
  await button.click();
  await button.click(); // off again: a toast
  await button.click(); // on again: the pill is back, and the toast is still up
  const bar = page.getByRole("region", { name: "Compare cars" });
  const toast = page.getByTestId("toast");
  await expect(bar).toBeVisible();
  await expect(toast).toBeVisible();
  for (const el of [toast, bar]) expect(await el.evaluate((e) => getComputedStyle(e).transitionProperty)).toContain("opacity");
});
