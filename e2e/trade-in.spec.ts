import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

// A tap before React attaches does nothing.
async function open(page: Page) {
  await page.goto("/sell-your-car");
  await page.waitForFunction(() => Object.keys(document.querySelector("form")!).some((k) => k.startsWith("__reactFiber")));
}

async function contact(page: Page) {
  await page.getByLabel("Name").fill("Test Seller");
  await page.getByLabel("Phone").fill("087 123 4567");
  await page.getByRole("checkbox").check();
}

test.beforeEach(async ({ page }) => stubTurnstile(page));

// A real, tiny JPEG drawn in the page (toDataURL, so a toBlob override does not touch it). No fixture in the repo.
async function jpeg(page: Page) {
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 30;
    c.getContext("2d")!.fillRect(0, 0, 20, 15);
    return c.toDataURL("image/jpeg").split(",")[1];
  });
  return Buffer.from(data, "base64");
}
const files = (buffer: Buffer, n: number, ext = "jpg", mimeType = "image/jpeg") => Array.from({ length: n }, (_, i) => ({ name: `car-${i + 1}.${ext}`, mimeType, buffer }));
const picker = (page: Page) => page.locator('input[type="file"]');
const tiles = (page: Page) => page.getByRole("button", { name: /^Remove photo/ });
const TOO_BIG = "The photos are too big to send together. Remove one and try again.";

// Every toBlob call returns a blob of this size, so the re-encoded size can be set without big files.
async function encodeTo(page: Page, bytes: number) {
  await page.addInitScript((n) => {
    HTMLCanvasElement.prototype.toBlob = function (cb) {
      setTimeout(() => cb(new Blob([new Uint8Array(n)], { type: "image/jpeg" })));
    };
  }, bytes);
}

test("a photo is shrunk, previewed and sent with the valuation request", async ({ page }) => {
  await open(page);
  await picker(page).setInputFiles(files(await jpeg(page), 1));
  await expect(tiles(page)).toHaveCount(1);
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await page.getByLabel("Registration").fill("191-KY-1234");
  await page.getByLabel("Mileage").fill("120500");
  await contact(page);
  await page.getByRole("button", { name: "Get my valuation" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, we have your car." })).toBeFocused();
});

test("a removed photo leaves the grid and is announced", async ({ page }) => {
  await open(page);
  await picker(page).setInputFiles(files(await jpeg(page), 2));
  await expect(tiles(page)).toHaveCount(2);
  await expect(page.getByText("2 photos added. 2 of 12 photos.")).toBeAttached();
  await page.getByRole("button", { name: "Remove photo 2" }).click();
  await page.getByRole("button", { name: "Remove photo 1" }).click();
  await expect(tiles(page)).toHaveCount(0);
  await expect(page.getByText("Photo removed")).toBeAttached();
  await expect(page.getByText("Add photos")).toBeVisible();
});

test("13 photos keep 12 and hide the Add photos tile", async ({ page }) => {
  await open(page);
  await picker(page).setInputFiles(files(await jpeg(page), 13));
  await expect(page.getByText("You can add up to 12 photos.")).toBeVisible();
  await expect(tiles(page)).toHaveCount(12);
  await expect(page.getByText("Add photos")).toHaveCount(0);
});

test("a GIF is refused by name and the rest of the batch is kept", async ({ page }) => {
  await open(page);
  const buffer = await jpeg(page);
  await picker(page).setInputFiles([...files(buffer, 1), { name: "old-car.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") }]);
  await expect(page.getByText("old-car.gif is not a photo we can use. Use a JPEG, PNG or WebP under 15 MB.")).toBeVisible();
  await expect(tiles(page)).toHaveCount(1);
});

test("a photo that would take the total over 16 MB is refused and the rest are kept", async ({ page }) => {
  await encodeTo(page, 3 * 1024 * 1024);
  await open(page);
  await picker(page).setInputFiles(files(await jpeg(page), 6));
  await expect(page.getByText(TOO_BIG)).toBeVisible();
  await expect(tiles(page)).toHaveCount(5);
});

test("a photo still over 4 MB after shrinking is refused by name", async ({ page }) => {
  await encodeTo(page, 5 * 1024 * 1024);
  await open(page);
  await picker(page).setInputFiles(files(await jpeg(page), 1));
  await expect(page.getByText("car-1.jpg is not a photo we can use. Use a JPEG, PNG or WebP under 15 MB.")).toBeVisible();
  await expect(tiles(page)).toHaveCount(0);
});

test("a request the server refuses for size keeps the photos and the typed details", async ({ page }) => {
  await open(page);
  await page.route("**/sell-your-car", (route) => (route.request().method() === "POST" ? route.fulfill({ status: 413, body: "" }) : route.fallback()));
  await picker(page).setInputFiles(files(await jpeg(page), 2));
  await expect(tiles(page)).toHaveCount(2);
  await page.getByLabel("Registration").fill("191-KY-1234");
  await page.getByLabel("Mileage").fill("120500");
  await contact(page);
  await page.getByRole("button", { name: "Get my valuation" }).click();
  await expect(page.getByText("We could not send this.")).toBeVisible();
  await expect(page.getByText(/Your details are still here\./)).toBeVisible();
  await expect(tiles(page)).toHaveCount(2);
  await expect(page.getByLabel("Registration")).toHaveValue("191-KY-1234");
});

test("the photo grid fits a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page);
  await picker(page).setInputFiles([...files(await jpeg(page), 4), { name: `${"x".repeat(120)}.gif`, mimeType: "image/gif", buffer: Buffer.from("GIF89a") }]);
  await expect(tiles(page)).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("a lower-case reg and a mileage with a comma send", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1, name: "Sell your car" })).toBeVisible();
  await page.getByLabel("Registration").fill("191-ky-1234");
  await page.getByLabel("Mileage").fill("120,500");
  await contact(page);
  await page.getByRole("button", { name: "Get my valuation" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, we have your car." })).toBeFocused();
});

test("an empty reg is listed in the summary and the typed mileage stays", async ({ page }) => {
  await open(page);
  await page.getByLabel("Mileage").fill("120,500");
  await contact(page);
  await page.getByRole("button", { name: "Get my valuation" }).click();
  await expect(page.getByRole("heading", { name: "Check these details" })).toBeFocused();
  await page.getByRole("link", { name: "Enter the registration as shown on the car." }).click();
  await expect(page.getByLabel("Registration")).toBeFocused();
  await expect(page.getByLabel("Mileage")).toHaveValue("120,500");
});
