import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../../app/js/store.js";
import { normalizePhone } from "../../app/js/wa.js";
import { dayKey } from "../../app/js/format.js";

function withCustomer(name = "Bu Ani") {
  const r = S.addCustomer(S.emptyState(), { name, phone: "0812 3456 7890" }, normalizePhone);
  return { state: r.state, id: r.customer.id };
}

test("addCustomer validates name, duplicates and phone", () => {
  const s0 = S.emptyState();
  assert.equal(S.addCustomer(s0, { name: "  " }, normalizePhone).error, "customer.errName");
  const { state } = withCustomer("Bu Ani");
  assert.equal(S.addCustomer(state, { name: "bu  ani" }, normalizePhone).error, "customer.errDuplicate");
  assert.equal(S.addCustomer(state, { name: "Pak Budi", phone: "123" }, normalizePhone).error, "customer.errPhone");
  const ok = S.addCustomer(state, { name: "Pak Budi", phone: "" }, normalizePhone);
  assert.equal(ok.state.customers.length, 2);
  assert.equal(ok.customer.phone, "");
});

test("balance = debts − payments; payments are capped at the balance", () => {
  let { state, id } = withCustomer();
  state = S.addEntry(state, { kind: "debt", amount: 50000, customerId: id }).state;
  state = S.addEntry(state, { kind: "debt", amount: 10000, customerId: id }).state;
  const pay = S.addEntry(state, { kind: "pay", amount: 20000, customerId: id });
  assert.equal(pay.capped, false);
  state = pay.state;
  assert.equal(S.balanceOf(state, id), 40000);
  const over = S.addEntry(state, { kind: "pay", amount: 99999, customerId: id });
  assert.equal(over.capped, true);
  assert.equal(over.entry.amount, 40000);
  assert.equal(S.balanceOf(over.state, id), 0);
  assert.equal(S.addEntry(over.state, { kind: "pay", amount: 1, customerId: id }).error, "amount.errAmount");
});

test("addEntry rejects bad amounts and kinds", () => {
  const { state, id } = withCustomer();
  for (const amount of [0, -1, NaN, Infinity]) assert.ok(S.addEntry(state, { kind: "debt", amount, customerId: id }).error);
  assert.ok(S.addEntry(state, { kind: "steal", amount: 5 }).error);
});

test("customerSummaries sorts by largest debt and filters by name", () => {
  let { state, id } = withCustomer("Bu Ani");
  const b = S.addCustomer(state, { name: "Pak Budi" }, normalizePhone);
  state = b.state;
  state = S.addEntry(state, { kind: "debt", amount: 5000, customerId: id }).state;
  state = S.addEntry(state, { kind: "debt", amount: 9000, customerId: b.customer.id }).state;
  assert.deepEqual(S.customerSummaries(state).map((c) => c.name), ["Pak Budi", "Bu Ani"]);
  assert.deepEqual(S.customerSummaries(state, "ani").map((c) => c.name), ["Bu Ani"]);
  assert.equal(S.totalReceivable(state), 14000);
});

test("deleteCustomer removes their entries too", () => {
  let { state, id } = withCustomer();
  state = S.addEntry(state, { kind: "debt", amount: 5000, customerId: id }).state;
  state = S.addEntry(state, { kind: "in", amount: 7000, category: "sales" }).state;
  state = S.deleteCustomer(state, id);
  assert.equal(state.customers.length, 0);
  assert.deepEqual(state.entries.map((e) => e.kind), ["in"]);
});

test("cashByDay buckets the last 7 days", () => {
  const now = new Date(2026, 10, 27, 15).getTime();
  let state = S.emptyState();
  state = S.addEntry(state, { kind: "in", amount: 100, category: "sales" }, now).state;
  state = S.addEntry(state, { kind: "out", amount: 40, category: "stock" }, now - 86_400_000).state;
  state = S.addEntry(state, { kind: "in", amount: 999, category: "sales" }, now - 8 * 86_400_000).state; // outside window
  const days = S.cashByDay(state, dayKey, now);
  assert.equal(days.length, 7);
  assert.deepEqual([days[6].in, days[6].out, days[5].out], [100, 0, 40]);
  assert.equal(days.reduce((s, d) => s + d.in, 0), 100);
});

test("load/save round-trip and migrate tolerate bad data", () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const { state } = withCustomer();
  assert.ok(S.save(state, storage));
  assert.deepEqual(S.load(storage), state);
  mem.set(S.STORAGE_KEY, "{not json");
  assert.deepEqual(S.load(storage), S.emptyState());
  assert.deepEqual(S.migrate({ customers: "x", settings: { shop: "A" } }).settings.shop, "A");
});
