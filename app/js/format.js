// Formatting and parsing helpers. Pure functions, no DOM — unit-tested in tests/unit.

const rupiahFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/** 15000 -> "Rp 15.000" (non-breaking space normalised to a normal space). */
export function rupiah(n) {
  return rupiahFmt.formatToParts(Math.round(n || 0)).map((p) => p.value).join("").replace(/ /g, " ");
}

/** Short label for quick-amount chips: 5000 -> "5rb", 1500000 -> "1,5jt". */
export function shortRupiah(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "jt";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "rb";
  return String(n);
}

/**
 * Parse how people actually type money in Indonesia.
 * "15000", "15.000", "Rp 15.000", "15rb", "15 ribu", "15k", "1,5jt", "1.5 juta" -> integer rupiah.
 * Returns NaN when the input isn't a positive amount.
 */
export function parseAmount(input) {
  if (typeof input === "number") return input > 0 && Number.isFinite(input) ? Math.round(input) : NaN;
  let s = String(input ?? "").trim().toLowerCase().replace(/^rp\.?\s*/, "").replace(/\s+/g, "");
  if (!s) return NaN;
  let mult = 1;
  const suffix = s.match(/(rb|ribu|k|jt|juta)$/);
  if (suffix) {
    mult = suffix[1] === "jt" || suffix[1] === "juta" ? 1_000_000 : 1_000;
    s = s.slice(0, -suffix[1].length).replace(",", ".");
    // With a multiplier, a single "." or "," is a decimal separator ("1,5jt", "1.5jt").
    if ((s.match(/\./g) || []).length > 1) return NaN;
  } else {
    // Without a multiplier, "." and "," are thousands separators ("15.000", "15,000").
    if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(s)) return NaN;
    s = s.replace(/[.,]/g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  const n = Math.round(parseFloat(s) * mult);
  return n > 0 && Number.isFinite(n) ? n : NaN;
}

/** Local calendar day key, e.g. "2026-11-27". */
export function dayKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Whole calendar days between two timestamps (local time). */
export function daysBetween(from, to) {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(to); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86_400_000);
}

/** Relative day phrase using the active locale's `time` strings. */
export function relativeDay(ts, now, t) {
  const d = daysBetween(ts, now);
  if (d <= 0) return t("time.today");
  if (d === 1) return t("time.yesterday");
  return t("time.daysAgo", { n: d });
}

export function shortDate(ts, lang) {
  return new Date(ts).toLocaleDateString(lang === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "short" });
}

export function longDate(ts, lang) {
  return new Date(ts).toLocaleString(lang === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
