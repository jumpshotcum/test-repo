// @ts-check
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".card").first()).toBeVisible();
});

test("shows stats and every catalog entry", async ({ page }) => {
  const data = await (await page.request.get("/data/catalog.json")).json();
  const expected = data.plugins.length + data.standaloneSkills.length;
  await expect(page.locator(".card")).toHaveCount(expected);
  await expect(page.locator("#stats dd").first()).toHaveText(String(data.plugins.length));
});

test("search narrows results and highlights matches", async ({ page }) => {
  await page.getByLabel("Cari skill, agent, atau plugin").fill("playwright");
  await expect(page.locator("#count")).toContainText("Menampilkan");
  await expect(page.locator(".card", { hasText: "pw" }).first()).toBeVisible();
  await expect(page.locator(".card mark").first()).toBeVisible();
});

test("no results shows empty state and reset restores all", async ({ page }) => {
  const total = await page.locator(".card").count();
  await page.getByLabel("Cari skill, agent, atau plugin").fill("zzz-no-such-skill");
  await expect(page.getByRole("heading", { name: "Tidak ada yang cocok" })).toBeVisible();
  await page.getByRole("button", { name: "hapus semua filter" }).click();
  await expect(page.locator(".card")).toHaveCount(total);
});

test("kind and category filters combine", async ({ page }) => {
  const total = await page.locator(".card").count();
  await page.locator("#kindFilter").getByRole("button", { name: "Agent" }).click();
  await expect(page.locator("#kindFilter button[data-kind=agent]")).toHaveAttribute("aria-pressed", "true");
  const agents = await page.locator(".card").count();
  expect(agents).toBeLessThan(total);
  await page.locator('.chip[data-cat="Research"]').click();
  const both = await page.locator(".card").count();
  expect(both).toBeGreaterThan(0);
  expect(both).toBeLessThanOrEqual(agents);
  for (const cat of await page.locator(".card__cat").allTextContents()) expect(cat).toBe("Research");
});

test("detail dialog lists items with copyable invocations and syncs the URL", async ({ page }) => {
  await page.locator('.card[data-id="pw"]').click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "pw", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Salin /pw:fix" })).toBeVisible();
  expect(page.url()).toContain("open=pw");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator('.card[data-id="pw"]')).toBeFocused();
});

test("state is restored from the URL hash", async ({ page }) => {
  await page.goto("/#q=compliance&kind=skill");
  await expect(page.getByLabel("Cari skill, agent, atau plugin")).toHaveValue("compliance");
  await expect(page.locator("#kindFilter button[data-kind=skill]")).toHaveAttribute("aria-pressed", "true");
});

test("slash focuses search and theme toggle switches theme", async ({ page }) => {
  await page.keyboard.press("/");
  await expect(page.getByLabel("Cari skill, agent, atau plugin")).toBeFocused();
  await page.getByRole("button", { name: "Ganti tema terang/gelap" }).click();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(["light", "dark"]).toContain(theme);
});

test("no horizontal scroll", async ({ page }) => {
  // Allow 1px for subpixel rounding on high-DPR devices; report real offenders by name.
  const { sw, cw, offenders } = await page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > cw + 1)
      .slice(0, 5)
      .map((e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${e.className} → ${e.getBoundingClientRect().right.toFixed(1)}px`);
    return { sw: document.documentElement.scrollWidth, cw, offenders };
  });
  expect(offenders, "elements wider than the viewport").toEqual([]);
  expect(sw).toBeLessThanOrEqual(cw + 1);
});
