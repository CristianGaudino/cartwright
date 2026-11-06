import type { Page } from "@playwright/test";

// Stands in for Cloudflare's Turnstile script, so no spec ever calls Cloudflare. With pass, every render and reset
// issues a token the E2E fake backend accepts; without it, no token ever arrives (a failed bot check).
export async function stubTurnstile(page: Page, { pass = true }: { pass?: boolean } = {}) {
  const script = `(() => {
    const widgets = {};
    let n = 0;
    const issue = (id) => ${pass} && setTimeout(() => widgets[id] && widgets[id].callback("e2e-token"));
    window.turnstile = {
      render(el, opts) { const id = "w" + ++n; widgets[id] = opts; issue(id); return id; },
      reset(id) { issue(id); },
      remove(id) { delete widgets[id]; },
    };
  })();`;
  await page.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({ contentType: "text/javascript", body: script }));
}
