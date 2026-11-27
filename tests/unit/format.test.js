import { test } from "node:test";
import assert from "node:assert/strict";
import { rupiah, shortRupiah, parseAmount, dayKey, daysBetween } from "../../app/js/format.js";

test("rupiah formats Indonesian currency", () => {
  assert.equal(rupiah(15000), "Rp 15.000");
  assert.equal(rupiah(0), "Rp 0");
  assert.equal(rupiah(1250000), "Rp 1.250.000");
});

test("shortRupiah labels quick chips", () => {
  assert.equal(shortRupiah(5000), "5rb");
  assert.equal(shortRupiah(100000), "100rb");
  assert.equal(shortRupiah(1500000), "1,5jt");
});

test("parseAmount understands how people type money", () => {
  const cases = {
    "15000": 15000, "15.000": 15000, "15,000": 15000, "Rp 15.000": 15000, "rp15.000": 15000,
    "15rb": 15000, "15 ribu": 15000, "15k": 15000, "1,5jt": 1500000, "1.5 juta": 1500000, "2,5rb": 2500,
  };
  for (const [input, want] of Object.entries(cases)) assert.equal(parseAmount(input), want, input);
});

test("parseAmount rejects invalid or non-positive input", () => {
  for (const bad of ["", "abc", "0", "-5000", "1.2.3jt", "15.00", "12a", null, undefined]) {
    assert.ok(Number.isNaN(parseAmount(bad)), String(bad));
  }
});

test("dayKey and daysBetween use local calendar days", () => {
  const a = new Date(2026, 10, 27, 23, 59).getTime();
  const b = new Date(2026, 10, 28, 0, 1).getTime();
  assert.equal(dayKey(a), "2026-11-27");
  assert.equal(daysBetween(a, b), 1);
});
