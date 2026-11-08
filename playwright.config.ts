import { defineConfig, devices } from "@playwright/test";

// Runs against E2E_BASE_URL, or a local production build (npm run build && npm start) on PORT (default 3000).
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  testDir: "e2e",
  // A CI runner is slower than a laptop: a longer wait on every check, and one retry so a stray slow test does not fail the pull request.
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL, ...devices["Pixel 7"] },
  // E2E_FAIL_QUERY is the failure-state switch; a server already running on that port without it makes the failure specs fail.
  // E2E_FAKE_BACKENDS swaps the lead store and mailer for in-memory fakes (src/lib/leads/deps.ts). Only ever set here.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm start", url: baseURL, reuseExistingServer: false, env: { E2E_FAIL_QUERY: "e2e-forced-failure", E2E_FAKE_BACKENDS: "1" } },
});
