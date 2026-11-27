// @ts-check
import { test, expect } from "@playwright/test";

const sheet = (page) => page.locator("#sheet");

async function addCustomer(page, name, phone = "") {
  await page.getByRole("button", { name: "Tambah pelanggan" }).click();
  await sheet(page).getByLabel("Nama").fill(name);
  if (phone) await sheet(page).getByLabel("Nomor WhatsApp (opsional)").fill(phone);
  await sheet(page).getByRole("button", { name: "Simpan pelanggan" }).click();
  await expect(sheet(page).getByRole("heading", { name })).toBeVisible();
  await sheet(page).getByRole("button", { name: "Tutup" }).click();
}

/** Tab-bar navigation. Uses dispatchEvent because Playwright's scroll-into-view is unreliable
 *  for position:fixed elements under mobile emulation; the hit-test is covered by its own test. */
async function goTab(page, name) {
  await page.locator(".tabs").getByRole("button", { name, exact: true }).dispatchEvent("click");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/app/");
});

test("empty state explains how to start", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Belum ada pelanggan" })).toBeVisible();
  await expect(page.locator("#totalReceivable")).toHaveText("Rp 0");
});

test("records a kasbon in two taps from the list", async ({ page }) => {
  await addCustomer(page, "Bu Ani");
  await page.getByRole("button", { name: "Kasbon cepat untuk Bu Ani" }).click();   // tap 1
  await sheet(page).getByRole("button", { name: "Rp 10.000" }).click();             // tap 2
  await expect(sheet(page)).not.toBeVisible();
  await expect(page.locator("#totalReceivable")).toHaveText("Rp 10.000");
  await expect(page.getByRole("status").filter({ hasText: "Kasbon Rp 10.000 dicatat" })).toBeVisible();
});

test("undo removes the last kasbon", async ({ page }) => {
  await addCustomer(page, "Bu Ani");
  await page.getByRole("button", { name: "Kasbon cepat untuk Bu Ani" }).click();
  await sheet(page).getByRole("button", { name: "Rp 20.000" }).click();
  await page.getByRole("button", { name: "Batalkan" }).click();
  await expect(page.locator("#totalReceivable")).toHaveText("Rp 0");
});

test("typed amounts, payments, overpay capping and paid-up state", async ({ page }) => {
  await addCustomer(page, "Pak Budi");
  await page.getByRole("button", { name: "Pak Budi" }).first().click();
  await sheet(page).getByRole("button", { name: "Catat kasbon" }).click();
  await sheet(page).getByLabel("Nominal lain").fill("15rb");
  await sheet(page).getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(sheet(page).locator("#detailBalance")).toHaveText("Rp 15.000");

  await sheet(page).getByRole("button", { name: "Catat bayar" }).click();
  await sheet(page).getByLabel("Nominal lain").fill("100000");
  await sheet(page).getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Bayar melebihi sisa utang" })).toBeVisible();
  await expect(sheet(page).locator("#detailBalance")).toHaveText("Lunas");
  await expect(sheet(page).getByRole("link", { name: "Tagih via WA" })).toHaveCount(0);
});

test("invalid amount shows a helpful error and saves nothing", async ({ page }) => {
  await addCustomer(page, "Bu Ani");
  await page.getByRole("button", { name: "Kasbon cepat untuk Bu Ani" }).click();
  await sheet(page).getByLabel("Nominal lain").fill("abc");
  await sheet(page).getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(sheet(page).getByRole("alert")).toContainText("Nominal belum benar");
  await expect(sheet(page).getByLabel("Nominal lain")).toBeFocused();
});

test("customer validation: empty name, duplicate, bad phone", async ({ page }) => {
  await addCustomer(page, "Bu Ani");
  await page.getByRole("button", { name: "Tambah pelanggan" }).click();
  await sheet(page).getByRole("button", { name: "Simpan pelanggan" }).click();
  await expect(sheet(page).getByRole("alert")).toContainText("Nama belum diisi");
  await sheet(page).getByLabel("Nama").fill("bu ani");
  await sheet(page).getByRole("button", { name: "Simpan pelanggan" }).click();
  await expect(sheet(page).getByRole("alert")).toContainText("Sudah ada pelanggan");
  await sheet(page).getByLabel("Nama").fill("Mbak Rina");
  await sheet(page).getByLabel("Nomor WhatsApp (opsional)").fill("123");
  await sheet(page).getByRole("button", { name: "Simpan pelanggan" }).click();
  await expect(sheet(page).getByRole("alert")).toContainText("Nomor WA kurang tepat");
});

test("WhatsApp reminder link has normalised number and the balance", async ({ page }) => {
  await addCustomer(page, "Bu Ani", "0812-3456-7890");
  await page.getByRole("button", { name: "Kasbon cepat untuk Bu Ani" }).click();
  await sheet(page).getByRole("button", { name: "Rp 50.000" }).click();
  await page.getByRole("button", { name: "Bu Ani" }).first().click();
  const href = await sheet(page).getByRole("link", { name: "Tagih via WA" }).getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
  expect(decodeURIComponent(href.split("text=")[1])).toContain("Rp 50.000");
});

test("data persists across reloads", async ({ page }) => {
  await addCustomer(page, "Bu Ani");
  await page.getByRole("button", { name: "Kasbon cepat untuk Bu Ani" }).click();
  await sheet(page).getByRole("button", { name: "Rp 5.000" }).click();
  await page.reload();
  await expect(page.locator("#totalReceivable")).toHaveText("Rp 5.000");
});

test("cash in/out updates today's totals and the chart table", async ({ page }) => {
  await goTab(page, "Kas");
  await page.getByRole("button", { name: "Uang masuk" }).click();
  await sheet(page).getByLabel("Nominal lain").fill("250.000");
  await sheet(page).getByRole("button", { name: "Simpan", exact: true }).click();
  await page.getByRole("button", { name: "Uang keluar" }).click();
  await sheet(page).getByRole("button", { name: "Rp 100.000" }).click();
  await expect(page.locator("#todayStats")).toContainText("Rp 150.000");
  await expect(page.locator("#weekChart path.bar-in")).toHaveCount(1);
  await page.getByText("Tabel 7 hari terakhir").click();
  await expect(page.locator("#weekChart table tbody tr")).toHaveCount(7);
});

test("backup download then restore round-trips data", async ({ page }) => {
  await addCustomer(page, "Bu Ani");
  await page.getByRole("button", { name: "Kasbon cepat untuk Bu Ani" }).click();
  await sheet(page).getByRole("button", { name: "Rp 20.000" }).click();
  await goTab(page, "Data");
  await expect(page.locator("#backupStatus")).toContainText("belum pernah");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Unduh file cadangan" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^kasku-cadangan-\d{8}-\d{4}\.json$/);
  const file = await download.path();
  await expect(page.locator("#backupStatus")).toContainText("Cadangan terakhir hari ini");

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await goTab(page, "Data");
  await page.locator("#restoreInput").setInputFiles(file);
  await expect(sheet(page)).toContainText("1 pelanggan dan 1 catatan");
  await sheet(page).getByRole("button", { name: "Ganti dengan cadangan" }).click();
  await goTab(page, "Kasbon");
  await expect(page.locator("#totalReceivable")).toHaveText("Rp 20.000");
});

test("restoring a non-Kasku file is refused and keeps data", async ({ page }) => {
  await addCustomer(page, "Bu Ani");
  await goTab(page, "Data");
  await page.locator("#restoreInput").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"hello":1}') });
  await expect(sheet(page).getByRole("alert")).toContainText("bukan cadangan Kasku");
});

test("settings: shop name and English UI", async ({ page }) => {
  await goTab(page, "Data");
  await page.getByLabel("Nama toko").fill("Warung Bu Sri");
  await page.getByLabel("Bahasa").selectOption("en");
  await page.getByRole("button", { name: "Simpan pengaturan" }).click();
  await expect(page.locator("#shopName")).toHaveText("Warung Bu Sri");
  await expect(page.getByRole("button", { name: "Save settings" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("tab bar is the top-most element where users tap it", async ({ page }) => {
  const ok = await page.evaluate(() => [...document.querySelectorAll(".tab")].every((tab) => {
    const r = tab.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return tab.contains(hit);
  }));
  expect(ok).toBe(true);
});

test("no horizontal scroll and no console errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.reload();
  await addCustomer(page, "Ibu Pelanggan Dengan Nama Sangat Panjang Sekali Untuk Uji");
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw).toBeLessThanOrEqual(cw + 1);
  expect(errors).toEqual([]);
});
