import { defineConfig, devices } from "@playwright/test";

// Runs against E2E_BASE_URL, or a local production build (npm run build && npm start).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL, ...devices["Pixel 7"] },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm start", url: baseURL, reuseExistingServer: !process.env.CI },
});
