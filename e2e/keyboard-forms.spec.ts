import { expect, test } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends, like the other lead specs.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

// A mouse and keyboard: the long drop-downs can be typed into only with a fine pointer.
test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });
test.beforeEach(async ({ page }) => stubTurnstile(page));

test("Enter picks a drop-down option without moving on; Enter in a text field still goes to the next step", async ({ page }) => {
  await page.goto("/find-a-car");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  const step1 = page.getByRole("heading", { name: /^Step 1 of 4/ });
  await expect(step1).toBeVisible();

  const make = page.getByRole("combobox", { name: "Make" });
  await make.click();
  await make.fill("Toyota");
  await make.press("Enter");
  await expect(page.locator('input[name="make"]')).toHaveValue("Toyota");
  await expect(step1).toBeVisible();
  await expect(page.getByText("Add a make, a model or a type of car.", { exact: true })).toHaveCount(0);

  // With no submit button on a step, Enter in a plain field moves on (LeadForm's onKeyDown).
  await page.getByLabel("Model").fill("Corolla");
  await page.getByLabel("Model").press("Enter");
  await expect(page.getByRole("heading", { name: /^Step 2 of 4/ })).toBeVisible();
});
