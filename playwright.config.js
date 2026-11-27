// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

module.exports = defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173", trace: "off", launchOptions: { executablePath } },
  webServer: { command: "python3 -m http.server 4173", url: "http://localhost:4173", reuseExistingServer: !process.env.CI },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    { name: "mobile", use: { ...devices["Pixel 5"], launchOptions: { executablePath } } },
  ],
});
