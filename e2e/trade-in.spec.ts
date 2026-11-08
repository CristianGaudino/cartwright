import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PHOTO_MIN_COUNT, PHOTO_MIN_ERROR } from "../src/lib/leads/constants";
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
  await page.getByLabel("Registration", { exact: true }).fill(reg);
  await page.getByLabel("Mileage", { exact: true }).fill(km);
}
async function toStep(page: Page, n: 2 | 3 | 4, reg?: string, km?: string) {
  await car(page, reg, km);
  for (let i = 1; i < n; i++) {
    if (i === 3) await addPhotos(page); // the photo step needs its minimum before it lets the buyer on
    await next(page).click();
  }
  // The new step takes focus on its heading; wait for that, so nothing typed next is overtaken by it.
  await expect(page.getByRole("heading", { name: new RegExp(`^Step ${n} of 4`) })).toBeFocused();
}
async function addPhotos(page: Page, count = PHOTO_MIN_COUNT) {
  await picker(page).setInputFiles(files(await jpeg(page), count));
  await expect(tiles(page)).toHaveCount(count);
}
async function contact(page: Page) {
  await page.getByLabel("Name", { exact: true }).fill("Test Seller");
  await page.getByLabel("Phone", { exact: true }).fill("087 123 4567");
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

test("it is a trade-in valuation page that explains itself, in four steps, with the lookup joined to the registration", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1, name: "Trade-In Valuation" })).toBeVisible();
  await expect(page.getByText("The valuation is an estimate. It can change when we inspect the car.")).toBeVisible();
  await expect(page.getByText("Include all damage in your photos, even small marks.").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Required Photos" })).toBeVisible();
  await expect(page.getByText("Four short steps")).toHaveCount(0);
  await expect(page.getByText("Prefer to talk?")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Progress" }).getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: /^Step 1 of 4/ })).toBeVisible();
  // The registration lookup is only an indication for now, joined to the field's right edge as one control.
  const lookup = page.getByRole("button", { name: "Look Up", exact: true });
  await expect(lookup).toHaveAttribute("aria-disabled", "true");
  const [field, button] = [(await page.getByLabel("Registration", { exact: true }).boundingBox())!, (await lookup.boundingBox())!];
  expect(Math.abs(field.x + field.width - button.x)).toBeLessThan(1.5);
  expect(Math.abs(field.y - button.y)).toBeLessThan(1.5);
  expect(Math.abs(field.height - button.height)).toBeLessThan(1.5);
});

test("Back keeps what was typed, and the old /sell-your-car address lands here", async ({ page }) => {
  await open(page);
  await toStep(page, 2, "191-KY-1234", "120,500");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Registration", { exact: true })).toHaveValue("191-KY-1234");
  await expect(page.getByLabel("Mileage", { exact: true })).toHaveValue("120,500");
  await page.goto("/sell-your-car");
  await expect(page).toHaveURL(/\/trade-in$/);
});

test("Next refuses until the photos are in, and the note goes by itself once they are", async ({ page }) => {
  await encodeTo(page, 1000, 400);
  await open(page);
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), PHOTO_MIN_COUNT)); // being shrunk: none counted yet
  await next(page).click();
  await expect(page.locator("p", { hasText: PHOTO_MIN_ERROR })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Step 3 of 4/ })).toBeVisible();
  await expect(tiles(page)).toHaveCount(PHOTO_MIN_COUNT, { timeout: 20_000 });
  await expect(page.locator("p", { hasText: PHOTO_MIN_ERROR })).toHaveCount(0); // fixed, so gone, with no second click
  await expect(page.getByRole("alert").filter({ hasText: "a look" })).toHaveCount(0);
  await next(page).click();
  await expect(page.getByRole("heading", { name: /^Step 4 of 4/ })).toBeVisible();
});

test("an error goes as soon as the field is put right, and the count goes down", async ({ page }) => {
  await open(page);
  await next(page).click();
  const alert = page.getByRole("alert").filter({ hasText: "a look" });
  await expect(alert).toContainText("2 fields need a look.");
  await page.getByLabel("Registration", { exact: true }).fill("191-KY-1234");
  await expect(page.locator("p", { hasText: "Enter the registration as shown on the car." })).toHaveCount(0);
  await expect(alert).toContainText("One field needs a look.");
  await page.getByLabel("Mileage", { exact: true }).fill("120500");
  await expect(alert).toHaveCount(0);
  await next(page).click();
  await expect(page.getByRole("heading", { name: /^Step 2 of 4/ })).toBeVisible();
});

test("Back and Next are the same width and sit on the right", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  await toStep(page, 2);
  const [back, forward] = [(await page.getByRole("button", { name: "Back", exact: true }).boundingBox())!, (await next(page).boundingBox())!];
  expect(Math.round(back.width)).toBe(Math.round(forward.width));
  expect(Math.round(back.height)).toBe(Math.round(forward.height));
  const form = (await page.locator("form").boundingBox())!;
  expect(form.x + form.width - (forward.x + forward.width)).toBeLessThan(40); // against the right edge of the form
});

test("a photo is shrunk, previewed and sent with the valuation request", async ({ page }) => {
  await open(page);
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), PHOTO_MIN_COUNT));
  await expect(tiles(page)).toHaveCount(PHOTO_MIN_COUNT);
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
  await expect(page.getByRole("button", { name: /^Add photo: Front/ })).toBeVisible(); // the empty slots are back
});

test("empty slots say what to photograph, fill in order, and the first six are required", async ({ page }) => {
  await open(page);
  await toStep(page, 3);
  await expect(page.getByRole("button", { name: /^Add photo: Front, required/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Add photo: Any Damage, recommended/ })).toBeVisible();
  await picker(page).setInputFiles(files(await jpeg(page), 2));
  await expect(tiles(page)).toHaveCount(2);
  await expect(page.getByRole("button", { name: /^Add photo: Front/ })).toHaveCount(0); // taken by the first photo
  await expect(page.getByRole("button", { name: /^Add photo: Driver's Side, required/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Add photo: Dashboard and Mileage, recommended/ })).toBeVisible(); // beyond the six
  await next(page).click();
  await expect(page.locator("p", { hasText: PHOTO_MIN_ERROR })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Step 3 of 4/ })).toBeVisible();
});

test("13 photos keep 12 and hide the Add photos tile", async ({ page }) => {
  await open(page);
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), 13));
  await expect(page.getByText("You can add up to 12 photos.")).toBeVisible({ timeout: 20_000 }); // 13 photos are shrunk one by one
  await expect(tiles(page)).toHaveCount(12);
  await expect(page.getByText("Add photos")).toHaveCount(0);
});

test("a GIF is refused by name and the rest of the batch is kept", async ({ page }) => {
  await open(page);
  await toStep(page, 3);
  const buffer = await jpeg(page);
  await picker(page).setInputFiles([...files(buffer, 1), { name: "old-car.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") }]);
  await expect(page.getByText("old-car.gif isn't a photo we can use. Use a JPEG, PNG or WebP under 15 MB.")).toBeVisible();
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
  await expect(page.getByText("car-1.jpg isn't a photo we can use. Use a JPEG, PNG or WebP under 15 MB.")).toBeVisible();
  await expect(tiles(page)).toHaveCount(0);
});

test("a request the server refuses for size keeps the photos and the typed details", async ({ page }) => {
  await open(page);
  await page.route("**/trade-in", (route) => (route.request().method() === "POST" ? route.fulfill({ status: 413, body: "" }) : route.fallback()));
  await toStep(page, 3);
  await picker(page).setInputFiles(files(await jpeg(page), PHOTO_MIN_COUNT));
  await expect(tiles(page)).toHaveCount(PHOTO_MIN_COUNT);
  await next(page).click();
  await contact(page);
  await send(page).click();
  await expect(page.getByText("We couldn't send this.")).toBeVisible();
  await expect(page.getByText(/Your details are still here\./)).toBeVisible();
  await expect(tiles(page)).toHaveCount(PHOTO_MIN_COUNT);
  await expect(page.getByLabel("Registration", { exact: true })).toHaveValue("191-KY-1234");
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
  await page.getByLabel("Mileage", { exact: true }).fill("120,500");
  await next(page).click();
  await expect(page.getByRole("heading", { name: /^Step 1 of 4/ })).toBeVisible(); // did not move on
  await expect(page.getByRole("alert").filter({ hasText: "a look" })).toContainText("One field needs a look.");
  await expect(page.locator("p", { hasText: "Enter the registration as shown on the car." })).toBeVisible();
  await expect(page.getByLabel("Registration", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Mileage", { exact: true })).toHaveValue("120,500");
});

test("arriving at the last step sends nothing and shows no errors", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => r.method() === "POST" && posts.push(r.url()));
  await open(page);
  await toStep(page, 4);
  await page.waitForTimeout(500); // long enough for a send, and the errors it would bring, to have shown
  expect(posts).toEqual([]);
  await expect(page.getByRole("alert").filter({ hasText: "a look" })).toHaveCount(0);
  await expect(page.getByLabel("Name", { exact: true })).not.toBeFocused();
});

test("Enter in a field moves to the next step and never sends half the form", async ({ page }) => {
  await open(page);
  await car(page);
  await page.getByLabel("Mileage", { exact: true }).press("Enter");
  await expect(page.getByRole("heading", { name: /^Step 2 of 4/ })).toBeVisible();
});
