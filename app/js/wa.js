// WhatsApp reminder links (wa.me). No API, no server: the link opens the user's own WhatsApp.
import { rupiah } from "./format.js";

/**
 * Normalise an Indonesian phone number to wa.me form (digits, country code 62).
 * "0812-3456-7890" -> "6281234567890", "+62 812…" -> "62812…", "812…" -> "62812…".
 * Returns "" for empty input and null when the number is clearly invalid.
 */
export function normalizePhone(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  let d = s.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  if (!/^62\d{8,13}$/.test(d)) return null;
  return d;
}

/** Fill {nama}, {sisa}, {toko} in the template. Unknown placeholders are left as-is. */
export function buildReminder(template, { name, balance, shop }) {
  const vars = { nama: name, sisa: rupiah(balance), toko: shop };
  return String(template).replace(/\{(nama|sisa|toko)\}/g, (_, k) => vars[k]);
}

/** Build the wa.me URL. Without a phone, WhatsApp asks the user to pick a contact. */
export function waUrl(phone, text) {
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
