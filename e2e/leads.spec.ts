import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { inSoldWindow } from "../src/lib/stock/types";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

type Demo = { slug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => inSoldWindow(c, Date.now()));

// A tap before React attaches does nothing.
async function open(page: Page, slug: string) {
  await page.goto(`/used-cars/${slug}`);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const dialog = (page: Page) => page.getByRole("dialog", { name: "Enquire" });
const enquire = (page: Page) => page.getByRole("button", { name: "Enquire About This Car", exact: true });

test.beforeEach(async ({ page }) => stubTurnstile(page));

test("an enquiry from a car page ends on the thanks, and the next one starts empty", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = dialog(page);
  await expect(d).toBeVisible();
  await expect(d.getByRole("button", { name: "Close" })).toBeFocused();

  await d.getByLabel("Name").fill("Test Buyer");
  await d.getByLabel("Email").fill("buyer@example.com");
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Send enquiry" }).click();

  const thanks = d.getByRole("heading", { name: "Thanks, we have your enquiry." });
  await expect(thanks).toBeVisible();
  await expect(thanks).toBeFocused();

  await d.getByRole("button", { name: "Close" }).last().click();
  await expect(d).toBeHidden();
  await expect(enquire(page)).toBeFocused();
  await enquire(page).click();
  await expect(d.getByLabel("Name")).toHaveValue("");
  await expect(d.getByLabel("Email")).toHaveValue("");
  await expect(d.getByRole("checkbox")).not.toBeChecked();
});

test("closing the dialog keeps what was typed", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  await dialog(page).getByLabel("Name").fill("Half Typed");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await enquire(page).click();
  await expect(dialog(page).getByLabel("Name")).toHaveValue("Half Typed");
});

test("the dialog does not scroll itself: only the form body does", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await open(page, live.slug);
  await enquire(page).click();
  await expect(dialog(page)).toBeVisible();
  const [scrollHeight, clientHeight] = await dialog(page).evaluate((d) => [d.scrollHeight, d.clientHeight]);
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
});

test("a sold car has no lead buttons", async ({ page }) => {
  test.skip(!sold, "No demo car is inside the sold window: run npm run stock:redate to refresh the demo dates");
  await page.goto(`/used-cars/${sold!.slug}`);
  await expect(page.getByTestId("buy-box")).toBeVisible();
  for (const name of ["Enquire About This Car", "Book a Test Drive"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Call Us/ })).toHaveCount(0);
});

test("the bot check loads only once the dialog opens, and a failed check keeps what was typed", async ({ page }) => {
  await page.unrouteAll();
  await stubTurnstile(page, { pass: false });
  const calls: string[] = [];
  page.on("request", (r) => r.url().startsWith("https://challenges.cloudflare.com/") && calls.push(r.url()));
  await open(page, live.slug);
  expect(calls).toEqual([]);

  await enquire(page).click();
  const d = dialog(page);
  await expect.poll(() => calls.length).toBe(1);
  await d.getByLabel("Name").fill("Kept Name");
  await d.getByLabel("Email").fill("buyer@example.com");
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Send enquiry" }).click();
  await expect(d.getByRole("alert")).toContainText("We couldn't check this request.");
  await expect(d.getByLabel("Name")).toHaveValue("Kept Name");
  await expect(d.getByRole("button", { name: "Send enquiry" })).toBeEnabled();
});

test("an empty send focuses the first field and marks each one, with no summary bar", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = dialog(page);
  await d.getByRole("button", { name: "Send enquiry" }).click();

  await expect(d.getByRole("alert")).toHaveCount(0); // the errors sit by their fields; nothing above them pushes the form down
  await expect(d.locator("p", { hasText: "Enter your name." }).locator("svg")).toHaveCount(1); // each error leads with the alert icon
  await expect(d.getByLabel("Name")).toBeFocused();
  await expect(d.getByLabel("Name")).toHaveAttribute("aria-required", "true"); // the asterisk is drawn by CSS; the field says it for screen readers
  await expect(d.getByLabel("Phone", { exact: true })).not.toHaveAttribute("aria-required"); // phone or email, so neither is starred
  for (const label of ["Name", "Phone", "Email"]) await expect(d.getByLabel(label)).toHaveAttribute("aria-invalid", "true");
  await expect(d.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
  // The contact error shows once, under Email.
  await expect(d.locator("p", { hasText: "Add a phone number or an email." })).toHaveCount(1);
});

test("a field error keeps what was typed, and consent is needed to send", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = dialog(page);
  await d.getByLabel("Name").fill("Kept Name");
  await d.getByLabel("Email").fill("buyer@example.com");
  await d.getByRole("button", { name: "Send enquiry" }).click();

  await expect(d.locator("p", { hasText: "Tick the box to send your request." })).toBeVisible();
  await expect(d.locator("p", { hasText: "Enter your name." })).toHaveCount(0);
  await expect(d.getByLabel("Email")).toHaveValue("buyer@example.com");
  await expect(d.getByLabel("Name")).toHaveValue("Kept Name");
  await expect(d.getByRole("button", { name: "Send enquiry" })).toBeEnabled();

  const privacy = d.getByRole("link", { name: /Privacy Policy/ });
  await expect(privacy).toHaveAttribute("href", "/privacy");
  await expect(privacy).toHaveAttribute("target", "_blank");
});

// The fake backends live as long as the server, and a phone or email may hold one request per car: each request gets its own number.
const newPhone = () => `087 ${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
// Opens the test drive form on a car and fills it: the second day offered, and the given time or the first free one.
async function pickDrive(p: Page, { time, phone = newPhone() }: { time?: string; phone?: string } = {}) {
  await open(p, live.slug);
  await expect(p.getByRole("button", { name: /Reserve/ })).toHaveCount(0);
  await p.getByRole("button", { name: "Book a Test Drive", exact: true }).click();
  const d = p.getByRole("dialog", { name: "Book a Test Drive" });
  await expect(d).toBeVisible();
  await d.getByRole("combobox", { name: "Day" }).click();
  // Never today, whose first time can pass its hour's notice mid-run: the 15-day horizon always offers at least two later days.
  await p.getByRole("option").nth(2).click();
  await d.getByRole("combobox", { name: "Time" }).click();
  const slot = time ? p.getByRole("option", { name: time, exact: true }) : p.getByRole("option", { disabled: false }).nth(1); // a free time, past the hint
  const chosen = (await slot.textContent())!;
  await slot.click();
  await d.getByLabel("Name").fill("Test Driver");
  await d.getByLabel("Phone").fill(phone);
  await d.getByRole("checkbox").check();
  return { d, chosen };
}

test("Book a Test Drive asks for a day and a time, says we'll call to confirm, and the same time again is refused", async ({ page }) => {
  // Two buyers on the same car pick the same time before either sends: the first gets it, the second is told it was just taken.
  const other = await page.context().newPage(); // its own tab, so its own form and draft
  await stubTurnstile(other);
  const first = await pickDrive(page);
  const second = await pickDrive(other, { time: first.chosen });

  await first.d.getByRole("button", { name: "Send Request" }).click();
  await expect(first.d.getByRole("heading", { name: "Thanks, we have your request." })).toBeFocused();
  await expect(first.d.getByText(/We'll call you to confirm your test drive/)).toBeVisible();

  await second.d.getByRole("button", { name: "Send Request" }).click();
  await expect(second.d.getByRole("alert")).toHaveText("That time was just taken. Choose another.");
  // On a phone the alert sits above the fold: it takes focus, so it scrolls into view and is read out.
  await expect(second.d.getByRole("alert")).toBeInViewport();
  await expect(second.d.getByRole("alert")).toBeFocused();
  // Back in the picker, the time shows as taken.
  await second.d.getByRole("combobox", { name: "Time" }).click();
  await expect(other.getByRole("option", { name: first.chosen, exact: true })).toHaveAttribute("aria-disabled", "true");
  await other.close();
});

test("the same phone asking twice for the same car is told it already has a request, and keeps what it typed", async ({ page }) => {
  const phone = newPhone();
  const first = await pickDrive(page, { phone });
  await first.d.getByRole("button", { name: "Send Request" }).click();
  await expect(first.d.getByRole("heading", { name: "Thanks, we have your request." })).toBeFocused();

  const other = await page.context().newPage();
  await stubTurnstile(other);
  const second = await pickDrive(other, { phone: phone.replace(/^0/, "+353 ") }); // the same number, written another way
  await second.d.getByRole("button", { name: "Send Request" }).click();
  await expect(second.d.getByRole("alert")).toHaveText("This phone number or email already has a test drive request for this car. We'll call you to confirm it. Or call us on +353 83 133 3154.");
  await expect(second.d.getByRole("alert")).toBeInViewport();
  await expect(second.d.getByRole("alert")).toBeFocused();
  await expect(second.d.getByRole("alert").getByRole("link", { name: "+353 83 133 3154" })).toHaveAttribute("href", "tel:+353831333154");
  await expect(second.d.getByLabel("Name")).toHaveValue("Test Driver");
  await other.close();
});

test("a chosen time that becomes too soon stays chosen, and the send says why", async ({ page }) => {
  // A Tuesday in the past, 10:00 Irish time: 11:30 is the first time offered, and no real booking from the other specs (the server holds
  // from the real now on) can ever grey it out.
  await page.clock.install({ time: new Date("2025-11-25T10:00:00Z") });
  await open(page, live.slug);
  await page.getByRole("button", { name: "Book a Test Drive", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Book a Test Drive" });
  const time = d.getByRole("combobox", { name: "Time" });
  await d.getByRole("combobox", { name: "Day" }).click();
  await page.getByRole("option", { name: "Tue 25 Nov" }).click();
  await time.click();
  await page.getByRole("option", { name: "11:30", exact: true }).click();
  await d.getByLabel("Name").fill("Test Driver");
  await d.getByLabel("Phone").fill(newPhone());
  await d.getByRole("checkbox").check();

  await page.clock.fastForward("31:00"); // 10:31: 11:30 is now less than an hour away
  await time.click(); // a focus in the picker re-renders the lists
  await expect(page.getByRole("option", { name: "11:30", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await expect(time).toHaveValue("11:30");
  await d.getByRole("button", { name: "Send Request" }).click();
  await expect(d.getByText("Choose a time at least an hour from now.")).toBeVisible();
  await expect(time).toBeFocused();
});

test("Enquire and Book a Test Drive keep their own forms", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  await dialog(page).getByLabel("Message").fill("Is it taxed?");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Book a Test Drive", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Book a Test Drive" });
  await expect(d.getByRole("combobox", { name: "Day" })).toBeVisible();
  await expect(d.getByLabel("Anything we should know?")).toHaveValue("");
  await page.keyboard.press("Escape");
  await enquire(page).click();
  await expect(dialog(page).getByLabel("Message")).toHaveValue("Is it taxed?");
});

test("the enquiry dialog always shows the phone number with +353, as a link that dials", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = page.getByRole("dialog", { name: "Enquire" });
  await expect(d.getByText(/Or call us on/)).toBeVisible();
  await expect(d.getByRole("link", { name: "+353 83 133 3154" })).toHaveAttribute("href", "tel:+353831333154");
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("the dialog is a centred 520px panel", async ({ page }) => {
    await open(page, live.slug);
    await enquire(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toHaveCSS("opacity", "1"); // after the fade
    const box = (await dialog(page).boundingBox())!;
    expect(box.width).toBe(520);
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(1);
  });
});

test("the open dialog never scrolls sideways at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, live.slug);
  await enquire(page).click();
  await expect(dialog(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("the footer links the privacy page, which states the retention period", async ({ page }) => {
  await page.goto("/used-cars");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText("We keep each request for 12 months")).toBeVisible();
  // Deleting your details is asked for by email, not by phone.
  await expect(page.getByRole("main").getByRole("link", { name: /@/ })).toHaveAttribute("href", /^mailto:/);
  await expect(page.getByRole("main").getByRole("link", { name: "+353 83 133 3154" })).toHaveCount(0);
});

test("a car page offers a trade-in against it, with the car chosen; anything else in ?car= is a plain trade-in", async ({ page }) => {
  await open(page, live.slug);
  await page.getByRole("link", { name: "Trade in your car against this one" }).click();
  await expect(page).toHaveURL(new RegExp(`/trade-in\\?car=${live.slug}$`));
  const form = page.getByRole("main").locator("form");
  await expect(form.getByText(/€/)).toBeVisible(); // the chosen car's card, with its price
  for (const car of ["no-such-car-1", "../used-cars", "<b>", ...(sold ? [sold.slug] : [])]) {
    await page.goto(`/trade-in?car=${encodeURIComponent(car)}`);
    await expect(page.getByRole("heading", { name: /^Step 1 of 4/ })).toBeVisible();
    await expect(form.getByText(/€/)).toHaveCount(0);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("a car page still offers Call Us", async ({ page }) => {
    await page.goto(`/used-cars/${live.slug}`);
    await expect(page.getByRole("link", { name: /^Call Us/ })).toHaveAttribute("href", /^tel:/);
  });

  test("a lead form posts, so a send before the script loads never puts the details in the address", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("main").locator("form")).toHaveAttribute("method", "post");
  });
});
