import { expect, test } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// The content policy (next.config.ts) must never block something the site needs, and must keep the dangerous things off.
const PAGES = ["/", "/used-cars", "/finance", "/trade-in", "/find-a-car", "/service", "/contact", "/about", "/warranty", "/privacy", "/terms", "/saved", "/compare"];

test("every page sends the policy, with no eval and no wildcard", async ({ request }) => {
  for (const path of PAGES) {
    const csp = (await request.get(path)).headers()["content-security-policy"];
    expect(csp, path).toContain("script-src 'self'");
    expect(csp, path).not.toContain("unsafe-eval");
    expect(csp, path).not.toMatch(/(^|[ ;])\*|https:(;| |$)/); // no bare * and no "any https"
    expect(csp, path).toContain("frame-ancestors 'none'");
  }
});

test("no page, the map or the bot check is blocked by the policy", async ({ page }) => {
  test.skip(Boolean(process.env.E2E_BASE_URL), "uses the stubbed bot check");
  await stubTurnstile(page);
  await page.route("https://maps.google.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<p>map</p>" }));
  const blocked: string[] = [];
  page.on("console", (m) => /Content Security Policy|Refused to/i.test(m.text()) && blocked.push(m.text()));
  page.on("pageerror", (e) => /Content Security Policy/i.test(e.message) && blocked.push(e.message));
  for (const path of PAGES) {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
  }
  // A form loads the bot check script and widget.
  await page.goto("/find-a-car", { waitUntil: "networkidle" });
  await page.getByLabel(/^Make/).focus(); // the bot check loads on the first focus in a form
  await page.waitForTimeout(800);
  expect(blocked).toEqual([]);
});
