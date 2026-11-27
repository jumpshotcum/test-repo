import id from "../locales/id.js";
import en from "../locales/en.js";

export const LOCALES = { id, en };
let active = id;
let activeLang = "id";

export function setLang(lang) {
  activeLang = LOCALES[lang] ? lang : "id";
  active = LOCALES[activeLang];
  document.documentElement.lang = activeLang;
}

export const lang = () => activeLang;

/** t("kasbon.owes", { amount: "Rp 5.000" }) — falls back to Indonesian, then to the key. */
export function t(key, vars) {
  const get = (obj) => key.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  let s = get(active);
  if (typeof s !== "string") s = get(id);
  if (typeof s !== "string") return key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}
