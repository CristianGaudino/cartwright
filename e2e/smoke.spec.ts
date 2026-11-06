import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Carright" })).toBeVisible();
});

test("robots.txt answers", async ({ request }) => {
  expect((await request.get("/robots.txt")).status()).toBe(200);
});
