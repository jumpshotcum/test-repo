// Data model and pure state operations. Persistence is a thin wrapper at the bottom.
//
// State shape (schema v1):
// {
//   schema: 1,
//   customers: [{ id, name, phone, createdAt }],
//   entries:   [{ id, kind: "debt"|"pay"|"in"|"out", amount, customerId?, category?, note, at }],
//   settings:  { shop, lang, template },
//   lastBackupAt: number|null
// }

export const SCHEMA = 1;
export const STORAGE_KEY = "kasku:v1";

export function emptyState() {
  return { schema: SCHEMA, customers: [], entries: [], settings: { shop: "", lang: "id", template: "" }, lastBackupAt: null };
}

let counter = 0;
export function uid() {
  counter = (counter + 1) % 1e6;
  return Date.now().toString(36) + "-" + counter.toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ");

/** Balance owed by one customer: debts minus payments. Never negative. */
export function balanceOf(state, customerId) {
  let b = 0;
  for (const e of state.entries) {
    if (e.customerId !== customerId) continue;
    if (e.kind === "debt") b += e.amount;
    else if (e.kind === "pay") b -= e.amount;
  }
  return Math.max(0, b);
}

export function lastActivityOf(state, customerId) {
  let t = 0;
  for (const e of state.entries) if (e.customerId === customerId && e.at > t) t = e.at;
  return t || null;
}

/** Customers with computed balance, sorted: largest debt first, then oldest activity, then name. */
export function customerSummaries(state, query = "") {
  const q = norm(query).toLowerCase();
  return state.customers
    .filter((c) => !q || c.name.toLowerCase().includes(q))
    .map((c) => ({ ...c, balance: balanceOf(state, c.id), lastAt: lastActivityOf(state, c.id) }))
    .sort((a, b) => b.balance - a.balance || (a.lastAt ?? Infinity) - (b.lastAt ?? Infinity) || a.name.localeCompare(b.name, "id"));
}

export function totalReceivable(state) {
  return state.customers.reduce((sum, c) => sum + balanceOf(state, c.id), 0);
}

/** Validation errors are returned as { error: "i18n.key", vars } so the UI decides wording. */
export function addCustomer(state, { name, phone }, normalizePhone, now = Date.now()) {
  const n = norm(name);
  if (!n) return { error: "customer.errName" };
  if (state.customers.some((c) => c.name.toLowerCase() === n.toLowerCase())) return { error: "customer.errDuplicate", vars: { name: n } };
  const p = normalizePhone(phone);
  if (p === null) return { error: "customer.errPhone" };
  const customer = { id: uid(), name: n, phone: p, createdAt: now };
  return { state: { ...state, customers: [...state.customers, customer] }, customer };
}

export function updateCustomer(state, id, { name, phone }, normalizePhone) {
  const n = norm(name);
  if (!n) return { error: "customer.errName" };
  if (state.customers.some((c) => c.id !== id && c.name.toLowerCase() === n.toLowerCase())) return { error: "customer.errDuplicate", vars: { name: n } };
  const p = normalizePhone(phone);
  if (p === null) return { error: "customer.errPhone" };
  return { state: { ...state, customers: state.customers.map((c) => (c.id === id ? { ...c, name: n, phone: p } : c)) } };
}

export function deleteCustomer(state, id) {
  return {
    ...state,
    customers: state.customers.filter((c) => c.id !== id),
    entries: state.entries.filter((e) => e.customerId !== id),
  };
}

/**
 * Add an entry. Payments are capped at the outstanding balance so balances never go negative;
 * the result reports `capped: true` when that happened.
 */
export function addEntry(state, { kind, amount, customerId, category, note }, now = Date.now()) {
  if (!["debt", "pay", "in", "out"].includes(kind)) return { error: "amount.errAmount" };
  if (!(Number.isFinite(amount) && amount > 0)) return { error: "amount.errAmount" };
  let capped = false;
  if (kind === "pay") {
    const owed = balanceOf(state, customerId);
    if (owed <= 0) return { error: "amount.errAmount" };
    if (amount > owed) { amount = owed; capped = true; }
  }
  const entry = { id: uid(), kind, amount: Math.round(amount), at: now, note: norm(note) };
  if (kind === "debt" || kind === "pay") entry.customerId = customerId;
  else entry.category = category || "other";
  return { state: { ...state, entries: [...state.entries, entry] }, entry, capped };
}

export function removeEntry(state, id) {
  return { ...state, entries: state.entries.filter((e) => e.id !== id) };
}

export function entriesFor(state, customerId) {
  return state.entries.filter((e) => e.customerId === customerId).sort((a, b) => b.at - a.at);
}

/** Cash in/out per day for the last `days` days ending at `now` (oldest first). */
export function cashByDay(state, dayKey, now = Date.now(), days = 7) {
  const out = [];
  const index = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const row = { day: dayKey(d.getTime()), ts: d.getTime(), in: 0, out: 0 };
    index.set(row.day, row);
    out.push(row);
  }
  for (const e of state.entries) {
    if (e.kind !== "in" && e.kind !== "out") continue;
    const row = index.get(dayKey(e.at));
    if (row) row[e.kind] += e.amount;
  }
  return out;
}

export function cashEntries(state) {
  return state.entries.filter((e) => e.kind === "in" || e.kind === "out").sort((a, b) => b.at - a.at);
}

// ---- Persistence (browser only) -------------------------------------------------------------

export function load(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function save(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Bring any older/partial state up to the current schema. */
export function migrate(data) {
  const base = emptyState();
  if (!data || typeof data !== "object") return base;
  return {
    schema: SCHEMA,
    customers: Array.isArray(data.customers) ? data.customers : [],
    entries: Array.isArray(data.entries) ? data.entries : [],
    settings: { ...base.settings, ...(data.settings || {}) },
    lastBackupAt: typeof data.lastBackupAt === "number" ? data.lastBackupAt : null,
  };
}
