import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

// A tap before React attaches does nothing.
async function open(page: Page) {
  await page.goto("/trade-in");
  await page.waitForFunction(() => Object.keys(document.querySelector("form")!).some((k) => k.startsWith("__reactFiber")));
}

const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true });
const send = (page: Page) => page.getByRole("button", { name: "Get my valuation" });

// The four steps: your car, condition, photos, your details.
async function car(page: Page, reg = "191-KY-1234", km = "120500") {
  await page.getByLabel("Registration").fill(reg);
  await page.getByLabel("Mileage").fill(km);
}
async function toStep(page: Page, n: 2 | 3 | 4, reg?: string, km?: string) {
  await car(page, reg, km);
  for (let i = 1; i < n; i++) await next(page).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Step ${n} of 4`) })).toBeVisible();
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
// By CSS, so a tile is still counted on a step that is not showing.
const tiles = (page: Page) => page.locator('button[aria-label^="Remove photo"]');
const TOO_BIG = "The photos are too big to send together. Remove one and try again.";

// Every toBlob call returns a blob of this size after a delay, so the re-encoded size and time can be set without big files.
async function encodeTo(page: Page, bytes: number, ms = 0) {
  await page.addInitScript(
    ([n, wait]) => {
      HTMLCanvasElement.prototype.toBlob = function (cb) {
        setTimeout(() => cb(new Blob([new Uint8Array(n)], { type: "image/jpeg" })), wait);
      };
    },
    [bytes, ms],
  );
}

test("it is a trade-in valuation page that explains itself, in four steps, with no Prefer to talk card", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1, name: "Trade-In Valuation" })).toBeVisible();
  await expect(page.getByText("The valuation is an estimate. It can change when we inspect the car.")).toBeVisible();
  await expect(page.getByText("Include all damage in your photos, even small marks.").first()).toBeVisible();
  await expect(page.getByText("Prefer to talk?")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Progress" }).getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: /^Step 1 of 4/ })).toBeVisible();
  // The registration lookup is only an indication for now.
  await expect(page.getByRole("button", { name: "Look up my car" })).toHaveAttribute("aria-disabled", "true");
});

test("Back keeps what was typed, and the old /sell-your-car address lands here", async ({ page }) => {
  await open(page);
  await toStep(page, 2, "191-KY-1234", "120,500");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Registration")).toHaveValue("191-KY-1234");
  await expect(page.getByLabel("Mileage")).toHaveValue("120,500");
  await page.goto("/sell-your-car");
  await expect(page).toHaveURL(/\/trade-in$/);
});

test("the send button waits while photos are being shrunk", async ({ page }) => {
  await encodeTo(page, 1000, 1500);
  await open(page);
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), 1));
  await next(page).click();
  await contact(page);
  await expect(send(page)).toBeDisabled();
  await expect(send(page)).toBeEnabled();
});

test("a photo is shrunk, previewed and sent with the valuation request", async ({ page }) => {
  await open(page);
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), 1));
  await expect(tiles(page)).toHaveCount(1);
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await next(page).click();
  await contact(page);
  await send(page).click();
  await expect(page.getByRole("heading", { name: "Thanks, we have your car details." })).toBeFocused();
});

test("a removed photo leaves the grid and is announced", async ({ page }) => {
  await open(page);
  await toStep(page, 3);
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
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), 13));
  await expect(page.getByText("You can add up to 12 photos.")).toBeVisible();
  await expect(tiles(page)).toHaveCount(12);
  await expect(page.getByText("Add photos")).toHaveCount(0);
});

test("a GIF is refused by name and the rest of the batch is kept", async ({ page }) => {
  await open(page);
  await toStep(page, 3);
  const buffer = await jpeg(page);
  await picker(page).setInputFiles([...files(buffer, 1), { name: "old-car.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") }]);
  await expect(page.getByText("old-car.gif is not a photo we can use. Use a JPEG, PNG or WebP under 15 MB.")).toBeVisible();
  await expect(tiles(page)).toHaveCount(1);
});

test("a photo that would take the total over 16 MB is refused and the rest are kept", async ({ page }) => {
  await encodeTo(page, 3 * 1024 * 1024);
  await open(page);
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), 6));
  await expect(page.getByText(TOO_BIG)).toBeVisible();
  await expect(tiles(page)).toHaveCount(5);
});

test("a photo still over 4 MB after shrinking is refused by name", async ({ page }) => {
  await encodeTo(page, 5 * 1024 * 1024);
  await open(page);
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), 1));
  await expect(page.getByText("car-1.jpg is not a photo we can use. Use a JPEG, PNG or WebP under 15 MB.")).toBeVisible();
  await expect(tiles(page)).toHaveCount(0);
});

test("a request the server refuses for size keeps the photos and the typed details", async ({ page }) => {
  await open(page);
  await page.route("**/trade-in", (route) => (route.request().method() === "POST" ? route.fulfill({ status: 413, body: "" }) : route.fallback()));
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), 2));
  await expect(tiles(page)).toHaveCount(2);
  await next(page).click();
  await contact(page);
  await send(page).click();
  await expect(page.getByText("We could not send this.")).toBeVisible();
  await expect(page.getByText(/Your details are still here\./)).toBeVisible();
  await expect(tiles(page)).toHaveCount(2);
  await expect(page.getByLabel("Registration")).toHaveValue("191-KY-1234");
});

test("the photo step fits a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page);
  await toStep(page, 3);
  await picker(page).setInputFiles([...files(await jpeg(page), 4), { name: `${"x".repeat(120)}.gif`, mimeType: "image/gif", buffer: Buffer.from("GIF89a") }]);
  await expect(tiles(page)).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("a lower-case reg and a mileage with a comma send", async ({ page }) => {
  await open(page);
  await toStep(page, 4, "191-ky-1234", "120,500");
  await contact(page);
  await send(page).click();
  await expect(page.getByRole("heading", { name: "Thanks, we have your car details." })).toBeFocused();
});

test("an empty reg stops the first step with a short note, and the typed mileage stays", async ({ page }) => {
  await open(page);
  await page.getByLabel("Mileage").fill("120,500");
  await next(page).click();
  await expect(page.getByRole("heading", { name: /^Step 1 of 4/ })).toBeVisible(); // did not move on
  await expect(page.getByRole("alert").filter({ hasText: "a look" })).toContainText("One field needs a look.");
  await expect(page.locator("p", { hasText: "Enter the registration as shown on the car." })).toBeVisible();
  await expect(page.getByLabel("Registration")).toBeFocused();
  await expect(page.getByLabel("Mileage")).toHaveValue("120,500");
});

test("Enter in a field moves to the next step and never sends half the form", async ({ page }) => {
  await open(page);
  await car(page);
  await page.getByLabel("Mileage").press("Enter");
  await expect(page.getByRole("heading", { name: /^Step 2 of 4/ })).toBeVisible();
});
