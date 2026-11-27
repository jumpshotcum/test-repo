// Backup file format and validation. A backup is a small JSON file the user keeps themselves.
import { SCHEMA, migrate } from "./store.js";

export const BACKUP_APP = "kasku";

export function makeBackup(state, now = Date.now()) {
  const { lastBackupAt, ...data } = state; // lastBackupAt is device-local, not part of the data
  return { app: BACKUP_APP, schema: SCHEMA, exportedAt: now, data };
}

export function backupFilename(now = Date.now()) {
  const d = new Date(now);
  const p = (n) => String(n).padStart(2, "0");
  return `kasku-cadangan-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isStr = (v) => typeof v === "string";

/**
 * Parse and validate backup text. Returns { ok: true, state, exportedAt, counts } or { ok: false }.
 * Validation is strict on shape so a random JSON file can never replace the user's data.
 */
export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false }; }
  if (!obj || obj.app !== BACKUP_APP || !isNum(obj.schema) || obj.schema > SCHEMA || !obj.data) return { ok: false };
  const { customers, entries } = obj.data;
  if (!Array.isArray(customers) || !Array.isArray(entries)) return { ok: false };
  const ids = new Set();
  for (const c of customers) {
    if (!c || !isStr(c.id) || !isStr(c.name) || !c.name.trim()) return { ok: false };
    if (c.phone != null && (!isStr(c.phone) || !/^(62\d{8,13})?$/.test(c.phone))) return { ok: false };
    ids.add(c.id);
  }
  for (const e of entries) {
    if (!e || !isStr(e.id) || !["debt", "pay", "in", "out"].includes(e.kind) || !isNum(e.amount) || e.amount <= 0 || !isNum(e.at)) return { ok: false };
    if ((e.kind === "debt" || e.kind === "pay") && !ids.has(e.customerId)) return { ok: false };
    if (e.note != null && !isStr(e.note)) return { ok: false };
    if ((e.kind === "in" || e.kind === "out") && !["sales", "stock", "ops", "other"].includes(e.category)) return { ok: false };
  }
  const st = obj.data.settings;
  if (st != null && (typeof st !== "object" || ["shop", "lang", "template"].some((k) => st[k] != null && !isStr(st[k])))) return { ok: false };
  const state = migrate(obj.data);
  state.settings = { shop: state.settings.shop, lang: state.settings.lang === "en" ? "en" : "id", template: state.settings.template };
  return {
    ok: true,
    state,
    exportedAt: isNum(obj.exportedAt) ? obj.exportedAt : null,
    counts: { customers: customers.length, entries: entries.length },
  };
}

export function backupIsStale(lastBackupAt, now = Date.now(), days = 7) {
  return !lastBackupAt || now - lastBackupAt > days * 86_400_000;
}
