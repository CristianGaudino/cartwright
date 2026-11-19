import { expect, test } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

test.beforeEach(async ({ page }) => stubTurnstile(page));

test("the phone is sent with its country code", async ({ page }) => {
  await page.goto("/contact");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  const form = page.getByRole("main").locator("form");
  await form.getByLabel("How can we help?").fill("Is the car still there?");
  await form.getByLabel("Name").fill("Test Buyer");
  await form.getByLabel("Country code").selectOption("GB");
  await form.getByLabel("Phone", { exact: true }).fill("7700 900123");
  await form.getByRole("checkbox").check();

  // The send is a server action posting the form as multipart; React may prefix each field name with a reference id.
  const sent = page.waitForRequest((r) => r.method() === "POST" && /name="(?:\d+_)?phone"/.test(r.postDataBuffer()?.toString() ?? ""));
  await form.getByRole("button", { name: "Send Message" }).click();
  const body = (await sent).postDataBuffer()!.toString();
  expect(body.match(/name="(?:\d+_)?phone"\r\n\r\n([^\r]*)/)?.[1]).toBe("+44 7700 900123");
  await expect(page.getByRole("heading", { name: "Thanks, we have your message." })).toBeVisible();
});
