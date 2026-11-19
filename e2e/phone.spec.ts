import { expect, test } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

test.beforeEach(async ({ page }) => stubTurnstile(page));

// Fills the contact form with the country and what was typed or pasted, sends it, and answers the phone the server received.
async function sendPhone(page: import("@playwright/test").Page, country: string, typed: string) {
  await page.goto("/contact");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  const form = page.getByRole("main").locator("form");
  await form.getByLabel("How can we help?").fill("Is the car still there?");
  await form.getByLabel("Name").fill("Test Buyer");
  await form.getByLabel("Country code").selectOption(country);
  await form.getByLabel("Phone", { exact: true }).fill(typed);
  await form.getByRole("checkbox").check();
  // The send is a server action posting the form as multipart; React prefixes each field name with a reference id ("_1_phone").
  const sent = page.waitForRequest((r) => r.method() === "POST" && /name="[^"]*phone"/.test(r.postDataBuffer()?.toString() ?? ""));
  await form.getByRole("button", { name: "Send Message" }).click();
  const body = (await sent).postDataBuffer()!.toString();
  await expect(page.getByRole("heading", { name: "Thanks, we have your message." })).toBeVisible();
  return { phone: body.match(/name="[^"]*phone"\r\n\r\n([^\r]*)/)?.[1], form };
}

test("the phone is sent with its country code", async ({ page }) => {
  expect((await sendPhone(page, "GB", "7700 900123")).phone).toBe("+44 7700 900123");
});

test("a number pasted with its own code switches the country instead of being sent under the one picked", async ({ page }) => {
  expect((await sendPhone(page, "PL", "+353 87 123 4567")).phone).toBe("+353 87 123 4567");
});
