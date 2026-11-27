import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../../app/js/store.js";
import { normalizePhone } from "../../app/js/wa.js";
import { makeBackup, parseBackup, backupIsStale, backupFilename } from "../../app/js/backup.js";

function sample() {
  const r = S.addCustomer(S.emptyState(), { name: "Bu Ani" }, normalizePhone);
  return S.addEntry(r.state, { kind: "debt", amount: 5000, customerId: r.customer.id }).state;
}

test("backup round-trips and reports counts", () => {
  const state = { ...sample(), lastBackupAt: 123 };
  const parsed = parseBackup(JSON.stringify(makeBackup(state, 1000)));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.counts, { customers: 1, entries: 1 });
  assert.equal(parsed.exportedAt, 1000);
  assert.deepEqual(parsed.state.customers, state.customers);
  assert.equal(parsed.state.lastBackupAt, null, "lastBackupAt is device-local and not restored");
});

test("parseBackup rejects anything that isn't a valid Kasku backup", () => {
  const good = makeBackup(sample());
  const bad = [
    "not json", "{}", JSON.stringify({ ...good, app: "other" }), JSON.stringify({ ...good, schema: 99 }),
    JSON.stringify({ ...good, data: { customers: [], entries: [{ id: "x", kind: "debt", amount: 5, at: 1, customerId: "missing" }] } }),
    JSON.stringify({ ...good, data: { customers: [{ id: "a", name: "" }], entries: [] } }),
    JSON.stringify({ ...good, data: { customers: [], entries: [{ id: "x", kind: "in", amount: -5, at: 1 }] } }),
    JSON.stringify({ ...good, data: { customers: [{ id: "a", name: "A", phone: 812 }], entries: [] } }),
    JSON.stringify({ ...good, data: { customers: [], entries: [{ id: "x", kind: "in", amount: 5, at: 1, category: "__proto__" }] } }),
    JSON.stringify({ ...good, data: { ...good.data, settings: { shop: { evil: 1 } } } }),
  ];
  for (const text of bad) assert.equal(parseBackup(text).ok, false, text.slice(0, 60));
});

test("backupIsStale after 7 days or when never backed up", () => {
  const now = Date.UTC(2026, 10, 27);
  assert.equal(backupIsStale(null, now), true);
  assert.equal(backupIsStale(now - 6 * 86_400_000, now), false);
  assert.equal(backupIsStale(now - 8 * 86_400_000, now), true);
});

test("backupFilename is dated", () => {
  assert.match(backupFilename(new Date(2026, 10, 27, 9, 5).getTime()), /^kasku-cadangan-20261127-0905\.json$/);
});
