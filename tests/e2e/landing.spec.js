// @ts-check
import { test, expect } from "@playwright/test";

test("landing explains the product and links to the app", async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/, (r) => r.abort()); // must work without CDNs
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kasbon tercatat");
  const cta = page.getByRole("link", { name: /Buka Kasku/ }).first();
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page).toHaveURL(/\/app\/$/);
  await expect(page.locator("#totalReceivable")).toBeVisible();
});

test("landing has valid structured data and no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  const types = ld["@graph"].map((n) => n["@type"]);
  expect(types).toEqual(expect.arrayContaining(["SoftwareApplication", "FAQPage"]));
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw).toBeLessThanOrEqual(cw + 1);
});
