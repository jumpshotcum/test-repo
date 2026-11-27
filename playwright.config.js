// @ts-check
import { defineConfig, devices } from "@playwright/test";

const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173", trace: "off", launchOptions: { executablePath }, locale: "id-ID", timezoneId: "Asia/Jakarta" },
  webServer: { command: "python3 -m http.server 4173", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], locale: "id-ID", launchOptions: { executablePath } } },
    { name: "mobile", use: { ...devices["Pixel 5"], locale: "id-ID", launchOptions: { executablePath } } },
  ],
});
