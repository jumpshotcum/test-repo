import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, buildReminder, waUrl } from "../../app/js/wa.js";

test("normalizePhone converts Indonesian formats to wa.me form", () => {
  assert.equal(normalizePhone("0812-3456-7890"), "6281234567890");
  assert.equal(normalizePhone("+62 857 1111 2222"), "6285711112222");
  assert.equal(normalizePhone("81234567890"), "6281234567890");
  assert.equal(normalizePhone(""), "");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("0812"), null);
});

test("buildReminder fills placeholders and leaves unknown ones", () => {
  const msg = buildReminder("Halo {nama}, sisa {sisa} di {toko}. {lain}", { name: "Bu Ani", balance: 25000, shop: "Warung Sri" });
  assert.equal(msg, "Halo Bu Ani, sisa Rp 25.000 di Warung Sri. {lain}");
});

test("waUrl encodes the message and works without a number", () => {
  assert.equal(waUrl("6281", "a b&c"), "https://wa.me/6281?text=a%20b%26c");
  assert.equal(waUrl("", "hi"), "https://wa.me/?text=hi");
});
