import { t, setLang, lang } from "./i18n.js";
import { rupiah, shortRupiah, parseAmount, dayKey, relativeDay, shortDate, longDate } from "./format.js";
import { normalizePhone, buildReminder, waUrl } from "./wa.js";
import * as S from "./store.js";
import { makeBackup, backupFilename, parseBackup, backupIsStale } from "./backup.js";

const $ = (sel) => document.querySelector(sel);
const QUICK_AMOUNTS = [2000, 5000, 10000, 20000, 50000, 100000];

let state = S.load();
let view = "kasbon";
let query = "";

// ---------------------------------------------------------------- DOM helpers (no innerHTML)
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
const SVGNS = "http://www.w3.org/2000/svg";
function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, String(v));
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
function icon(d, size = 20) {
  return s("svg", { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": "true" },
    s("path", { d, fill: "none", stroke: "currentColor", "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
}
const ICON = { plus: "M12 5v14M5 12h14", trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" };

function commit(next) {
  state = next;
  S.save(state);
  render();
}

// ---------------------------------------------------------------- toast with undo
let toastTimer;
function toast(message, undo) {
  const el = $("#toast");
  clearTimeout(toastTimer);
  el.replaceChildren(h("span", null, message));
  if (undo) {
    el.append(h("button", { type: "button", onclick: () => { undo(); toast(t("toast.undone")); } }, t("toast.undo")));
  }
  el.hidden = false;
  toastTimer = setTimeout(() => { el.hidden = true; }, undo ? 5000 : 2500);
}

// ---------------------------------------------------------------- sheet (dialog)
let sheetOnClose = null;
function openSheet(title, body, onClose) {
  $("#sheetTitle").textContent = title;
  $("#sheetBody").replaceChildren(body);
  sheetOnClose = onClose || null;
  const dlg = $("#sheet");
  if (!dlg.open) dlg.showModal();
  const first = dlg.querySelector("[autofocus]");
  if (first) first.focus();
}
function closeSheet() { const d = $("#sheet"); if (d.open) d.close(); }

// ---------------------------------------------------------------- i18n of static markup
function applyStaticText() {
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll("[data-i18n-label]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nLabel)); });
}

// ---------------------------------------------------------------- views
function render() {
  $("#shopName").textContent = state.settings.shop || t("tagline");
  document.querySelectorAll(".view").forEach((v) => { v.hidden = v.id !== "view-" + view; });
  document.querySelectorAll(".tab").forEach((b) => {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  renderBackupIndicators();
  if (view === "kasbon") renderKasbon();
  if (view === "kas") renderKas();
  if (view === "data") renderData();
}

function renderBackupIndicators() {
  const hasData = state.customers.length + state.entries.length > 0;
  const stale = hasData && backupIsStale(state.lastBackupAt);
  $("#backupDot").hidden = !stale;
  const pill = $("#backupPill");
  pill.hidden = !stale || view === "data";
  pill.replaceChildren(h("button", { type: "button", class: "backup-pill", onclick: () => go("data") }, "⚠ " + t("data.backupTitle")));
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function renderKasbon() {
  const total = S.totalReceivable(state);
  const list = S.customerSummaries(state, query);
  const owing = state.customers.filter((c) => S.balanceOf(state, c.id) > 0).length;
  $("#totalReceivable").textContent = rupiah(total);
  $("#receivableSub").textContent = owing ? t("kasbon.customersCount", { n: owing }) : (state.customers.length ? t("kasbon.allPaid") : "");

  const now = Date.now();
  $("#customerList").replaceChildren(...list.map((c) => h("li", { class: "customer" },
    h("button", { type: "button", class: "customer__main", "data-id": c.id, onclick: () => openCustomer(c.id) },
      h("span", { class: "avatar", "aria-hidden": "true" }, initials(c.name)),
      h("span", { class: "customer__text" },
        h("span", { class: "customer__name" }, c.name),
        h("span", { class: "customer__meta" }, c.lastAt ? t("kasbon.lastActivity", { when: relativeDay(c.lastAt, now, t) }) : "")),
      c.balance > 0
        ? h("span", { class: "customer__amount customer__amount--debt" }, rupiah(c.balance))
        : h("span", { class: "customer__amount customer__amount--paid" }, t("kasbon.paidUp"))),
    h("button", { type: "button", class: "customer__quick", "aria-label": t("kasbon.quickAdd", { name: c.name }), onclick: () => openAmount("debt", c.id) },
      icon(ICON.plus, 24)))));

  $("#customerEmpty").hidden = state.customers.length > 0;
  const noMatch = state.customers.length > 0 && list.length === 0;
  $("#customerNoMatch").hidden = !noMatch;
  if (noMatch) $("#customerNoMatch").textContent = t("kasbon.noMatch", { q: query });
}

function renderKas() {
  const days = S.cashByDay(state, dayKey);
  const today = days[days.length - 1];
  const stat = (label, value, sw) => h("div", { class: "stat" },
    h("p", { class: "stat__label" }, sw ? h("span", { class: "swatch swatch--" + sw, "aria-hidden": "true" }) : null, label),
    h("p", { class: "stat__value" }, value));
  $("#todayStats").replaceChildren(
    stat(t("kas.in"), rupiah(today.in), "in"),
    stat(t("kas.out"), rupiah(today.out), "out"),
    stat(t("kas.net"), (today.in - today.out < 0 ? "−" : "") + rupiah(Math.abs(today.in - today.out))));
  $("#weekChart").replaceChildren(weekChart(days));

  const entries = S.cashEntries(state).slice(0, 20);
  $("#cashEmpty").hidden = entries.length > 0;
  $("#cashList").replaceChildren(...entries.map((e) => h("li", null,
    h("span", { class: "ledger__text" },
      h("span", { class: "ledger__title" }, e.note || t("kas.categories." + e.category)),
      h("span", { class: "ledger__meta" }, t("kas.categories." + e.category) + " · " + shortDate(e.at, lang()))),
    h("span", { class: "ledger__amount ledger__amount--" + e.kind }, (e.kind === "in" ? "+" : "−") + rupiah(e.amount)),
    h("button", { type: "button", class: "icon-btn", "aria-label": t("kas.delete"), onclick: () => {
      const prev = state;
      commit(S.removeEntry(state, e.id));
      toast(t("toast.undone"), () => commit(prev));
    } }, icon(ICON.trash, 18)))));
}

/** 7-day grouped bars. Follows the dataviz skill: one axis, thin bars with 4px rounded tops,
 *  2px gap between paired bars, recessive grid, legend + direct table view, per-day hover tooltip. */
function weekChart(days) {
  const W = 320, H = 170, top = 14, bottom = 24, left = 4, right = 4;
  const max = Math.max(1, ...days.map((d) => Math.max(d.in, d.out)));
  const nice = niceMax(max);
  const plotH = H - top - bottom;
  const slot = (W - left - right) / days.length;
  const barW = Math.min(14, (slot - 10) / 2);
  const y = (v) => top + plotH - (v / nice) * plotH;
  const bar = (x, v, cls) => {
    if (v <= 0) return null;
    const hgt = Math.max(2, (v / nice) * plotH), r = Math.min(4, barW / 2, hgt);
    const x0 = x, y0 = top + plotH - hgt, x1 = x + barW, y1 = top + plotH;
    // Rounded data-end (top), square baseline.
    return s("path", { class: cls, d: `M${x0},${y1}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x1 - r}Q${x1},${y0} ${x1},${y0 + r}V${y1}Z` });
  };

  const wrap = h("div", { class: "chart-wrap" });
  const tip = h("div", { class: "chart-tip", hidden: true });
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": t("kas.week") });
  const grid = s("g", { class: "grid" }, [0.5, 1].map((f) => s("line", { x1: left, x2: W - right, y1: y(nice * f), y2: y(nice * f) })));
  const axis = s("g", { class: "axis" },
    s("text", { x: left, y: y(nice) - 4 }, shortRupiah(nice)),
    days.map((d, i) => s("text", { x: left + slot * i + slot / 2, y: H - 6, "text-anchor": "middle" }, new Date(d.ts).toLocaleDateString(lang() === "en" ? "en-GB" : "id-ID", { weekday: "short" }))));
  const baseline = s("line", { x1: left, x2: W - right, y1: top + plotH, y2: top + plotH, stroke: "var(--line)" });
  const bars = s("g", null, days.map((d, i) => {
    const cx = left + slot * i + slot / 2;
    return [bar(cx - barW - 1, d.in, "bar-in"), bar(cx + 1, d.out, "bar-out")];
  }));
  const hits = s("g", null, days.map((d, i) => {
    const label = t("kas.dayTooltip", { date: shortDate(d.ts, lang()), in: rupiah(d.in), out: rupiah(d.out) });
    const r = s("rect", { class: "hit", x: left + slot * i, y: top, width: slot, height: plotH, rx: 6, tabindex: 0, role: "img", "aria-label": label });
    const show = () => {
      tip.textContent = label;
      tip.hidden = false;
      const bb = svg.getBoundingClientRect();
      const px = ((left + slot * i + slot / 2) / W) * bb.width;
      const tw = Math.min(tip.offsetWidth, bb.width);
      tip.style.left = Math.min(Math.max(px, tw / 2), bb.width - tw / 2) + "px";
      tip.style.top = "0px";
    };
    r.addEventListener("pointerenter", show);
    r.addEventListener("focus", show);
    r.addEventListener("pointerleave", () => { tip.hidden = true; });
    r.addEventListener("blur", () => { tip.hidden = true; });
    return r;
  }));
  svg.append(grid, bars, baseline, axis, hits);
  wrap.append(svg, tip);

  const legend = h("div", { class: "legend" },
    h("span", null, h("span", { class: "swatch swatch--in", "aria-hidden": "true" }), t("kas.in")),
    h("span", null, h("span", { class: "swatch swatch--out", "aria-hidden": "true" }), t("kas.out")));
  const table = h("details", { class: "table-view" },
    h("summary", null, t("kas.weekTable")),
    h("table", { class: "table" },
      h("thead", null, h("tr", null, h("th", { scope: "col" }, t("kas.day")), h("th", { scope: "col" }, t("kas.in")), h("th", { scope: "col" }, t("kas.out")))),
      h("tbody", null, days.map((d) => h("tr", null, h("th", { scope: "row" }, shortDate(d.ts, lang())), h("td", null, rupiah(d.in)), h("td", null, rupiah(d.out)))))));
  const frag = document.createDocumentFragment();
  frag.append(wrap, legend, table);
  return frag;
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function renderData() {
  const status = $("#backupStatus");
  const stale = backupIsStale(state.lastBackupAt);
  if (!state.lastBackupAt) status.textContent = t("data.backupNever");
  else status.textContent = t("data.backupAge", { when: relativeDay(state.lastBackupAt, Date.now(), t) }) + (stale ? " " + t("data.backupWarn") : "");
  status.className = "notice" + (stale ? " notice--warn" : "");
  $("#shopInput").value = state.settings.shop;
  $("#langSelect").value = lang();
  $("#templateInput").value = state.settings.template || t("wa.defaultTemplate");
}

// ---------------------------------------------------------------- customer flows
function errorLine() { return h("p", { class: "error", role: "alert", hidden: true }); }

/** Show a validation message under a form and send focus back to the field at fault. */
function showFieldError(err, input, message) {
  err.textContent = message;
  err.hidden = false;
  input.setAttribute("aria-invalid", "true");
  input.focus();
}

function customerForm(existing) {
  const err = errorLine();
  const name = h("input", { name: "name", required: true, autocomplete: "off", maxlength: 60, placeholder: t("customer.namePlaceholder"), autofocus: true, value: existing?.name || "" });
  const phone = h("input", { name: "phone", type: "tel", inputmode: "tel", autocomplete: "off", maxlength: 20, placeholder: t("customer.phonePlaceholder"), value: existing?.phone ? "0" + existing.phone.slice(2) : "" });
  const save = h("button", { type: "submit", class: "btn btn--primary" }, t("customer.save"));
  const body = h("div", { class: "form" },
    h("label", { class: "field" }, h("span", null, t("customer.name")), name),
    h("label", { class: "field" }, h("span", null, t("customer.phone")), phone, h("small", { class: "hint" }, t("customer.phoneHint"))),
    err, save);
  const submit = (ev) => {
    ev.preventDefault();
    const res = existing
      ? S.updateCustomer(state, existing.id, { name: name.value, phone: phone.value }, normalizePhone)
      : S.addCustomer(state, { name: name.value, phone: phone.value }, normalizePhone);
    if (res.error) return showFieldError(err, res.error === "customer.errPhone" ? phone : name, t(res.error, res.vars));
    commit(res.state);
    toast(t("toast.customerSaved"));
    if (existing) openCustomer(existing.id);
    else openCustomer(res.customer.id);
  };
  return { body, submit };
}

function openNewCustomer() {
  const { body, submit } = customerForm(null);
  openSheet(t("customer.newTitle"), body);
  setSubmit(submit);
}

function setSubmit(fn) { $("#sheetForm").onsubmit = fn; }

function openCustomer(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return closeSheet();
  const bal = S.balanceOf(state, id);
  const entries = S.entriesFor(state, id);
  const shop = state.settings.shop || t("wa.shopFallback");
  const msg = buildReminder(state.settings.template || t("wa.defaultTemplate"), { name: c.name, balance: bal, shop });

  const body = h("div", { class: "form" },
    h("div", null,
      h("p", { class: "muted small" }, t("detail.balance")),
      h("p", { class: "balance" + (bal ? "" : " balance--zero"), id: "detailBalance" }, bal ? rupiah(bal) : t("kasbon.paidUp"))),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn btn--primary", onclick: () => openAmount("debt", id, { backToDetail: true }), autofocus: true }, icon(ICON.plus, 18), t("detail.addDebt")),
      bal > 0 ? h("button", { type: "button", class: "btn", onclick: () => openAmount("pay", id, { backToDetail: true }) }, t("detail.addPayment")) : null),
    bal > 0 ? h("a", { class: "btn btn--wa", href: waUrl(c.phone, msg), target: "_blank", rel: "noopener noreferrer" }, t("detail.remind")) : null,
    h("h3", { class: "card__title" }, t("detail.history")),
    entries.length
      ? h("ul", { class: "ledger" }, entries.map((e) => h("li", null,
          h("span", { class: "ledger__text" },
            h("span", { class: "ledger__title" }, e.note || t(e.kind === "debt" ? "detail.debt" : "detail.payment")),
            h("span", { class: "ledger__meta" }, t(e.kind === "debt" ? "detail.debt" : "detail.payment") + " · " + longDate(e.at, lang()))),
          h("span", { class: "ledger__amount ledger__amount--" + e.kind }, (e.kind === "debt" ? "+" : "−") + rupiah(e.amount)))))
      : h("p", { class: "muted" }, t("detail.historyEmpty")),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn", onclick: () => { const f = customerForm(c); openSheet(t("customer.editTitle"), f.body); setSubmit(f.submit); } }, t("detail.edit")),
      h("button", { type: "button", class: "btn btn--danger", onclick: () => confirmDelete(c, entries.length) }, t("customer.delete"))));
  openSheet(c.name, body);
  setSubmit((ev) => ev.preventDefault());
}

function confirmDelete(c, n) {
  const body = h("div", { class: "form" },
    h("p", null, t("customer.deleteConfirm", { name: c.name, n })),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn", autofocus: true, onclick: () => openCustomer(c.id) }, t("customer.deleteNo")),
      h("button", { type: "button", class: "btn btn--danger", onclick: () => {
        commit(S.deleteCustomer(state, c.id));
        closeSheet();
        toast(t("toast.customerDeleted"));
      } }, t("customer.deleteYes"))));
  openSheet(t("customer.delete"), body);
  setSubmit((ev) => ev.preventDefault());
}

/** Amount entry. Quick chips save immediately → kasbon in 2 taps (＋ then a chip). */
function openAmount(kind, customerId, { backToDetail = false } = {}) {
  const c = customerId ? state.customers.find((x) => x.id === customerId) : null;
  const isCash = kind === "in" || kind === "out";
  const owed = c ? S.balanceOf(state, c.id) : 0;
  const err = errorLine();
  const input = h("input", { name: "amount", inputmode: "decimal", autocomplete: "off", placeholder: t("amount.placeholder"), "aria-describedby": "amountErr" });
  err.id = "amountErr";
  const note = h("input", { name: "note", maxlength: 80, autocomplete: "off", placeholder: t("amount.notePlaceholder") });
  let category = kind === "in" ? "sales" : "stock";
  const catSelect = isCash ? h("select", { name: "category", onchange: (e) => { category = e.target.value; } },
    ["sales", "stock", "ops", "other"].map((k) => h("option", { value: k, selected: k === category }, t("kas.categories." + k)))) : null;

  const saveAmount = (amount) => {
    const res = S.addEntry(state, { kind, amount, customerId, category, note: note.value });
    if (res.error) return showFieldError(err, input, t(res.error));
    const prev = state;
    commit(res.state);
    const amt = rupiah(res.entry.amount);
    const msg = res.capped ? t("amount.errOverpay", { amount: amt })
      : t(kind === "debt" ? "toast.debtSaved" : kind === "pay" ? "toast.paySaved" : "toast.cashSaved", { amount: amt });
    toast(msg, () => commit(prev));
    if (c && backToDetail) openCustomer(c.id); else closeSheet();
  };

  const chips = h("div", { class: "chips" }, QUICK_AMOUNTS.map((a) =>
    h("button", { type: "button", class: "chip", "aria-label": rupiah(a), onclick: () => saveAmount(a) }, shortRupiah(a))));
  const body = h("div", { class: "form" },
    kind === "pay" ? h("button", { type: "button", class: "btn btn--primary", autofocus: true, onclick: () => saveAmount(owed) }, t("amount.payAll", { amount: rupiah(owed) })) : chips,
    h("label", { class: "field" }, h("span", null, t("amount.custom")), input),
    isCash ? h("label", { class: "field" }, h("span", null, t("kas.category")), catSelect) : null,
    h("label", { class: "field" }, h("span", null, t("amount.note")), note),
    err,
    h("button", { type: "submit", class: "btn" + (kind === "pay" ? "" : " btn--primary") }, t("amount.save")));

  const title = isCash ? t(kind === "in" ? "kas.inTitle" : "kas.outTitle")
    : t(kind === "debt" ? "amount.debtTitle" : "amount.payTitle", { name: c.name });
  openSheet(title, body);
  if (kind !== "pay") chips.querySelector("button").focus();
  setSubmit((ev) => {
    ev.preventDefault();
    const n = parseAmount(input.value);
    if (Number.isNaN(n)) return showFieldError(err, input, t("amount.errAmount"));
    saveAmount(n);
  });
}

// ---------------------------------------------------------------- backup
function backupBlob() {
  const now = Date.now();
  const file = new File([JSON.stringify(makeBackup(state, now), null, 1)], backupFilename(now), { type: "application/json" });
  return { file, now };
}

function markBackedUp(now) { commit({ ...state, lastBackupAt: now }); }

function download() {
  const { file, now } = backupBlob();
  const url = URL.createObjectURL(file);
  const a = h("a", { href: url, download: file.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  markBackedUp(now);
}

async function share() {
  const { file, now } = backupBlob();
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Kasku", text: file.name });
      markBackedUp(now);
    } catch (e) {
      if (e && e.name !== "AbortError") download();
    }
  } else {
    download();
  }
}

async function restore(fileInput) {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = "";
  if (!file) return;
  const parsed = parseBackup(await file.text());
  if (!parsed.ok) {
    openSheet(t("data.restore"), h("div", { class: "form" },
      h("p", { class: "error", role: "alert" }, t("data.restoreBad")),
      h("button", { type: "button", class: "btn", autofocus: true, onclick: closeSheet }, t("common.close"))));
    setSubmit((ev) => ev.preventDefault());
    return;
  }
  const body = h("div", { class: "form" },
    h("p", { class: "notice" }, t("data.restorePreview", {
      date: parsed.exportedAt ? longDate(parsed.exportedAt, lang()) : "?",
      customers: parsed.counts.customers, entries: parsed.counts.entries })),
    h("p", { class: "notice notice--warn" }, t("data.restoreWarn", { customers: state.customers.length, entries: state.entries.length })),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn", autofocus: true, onclick: closeSheet }, t("data.restoreNo")),
      h("button", { type: "button", class: "btn btn--primary", onclick: () => {
        commit({ ...parsed.state, lastBackupAt: Date.now() });
        setLang(state.settings.lang);
        applyStaticText();
        render();
        closeSheet();
        toast(t("toast.restored"));
      } }, t("data.restoreYes"))));
  openSheet(t("data.restore"), body);
  setSubmit((ev) => ev.preventDefault());
}

async function requestPersistence() {
  const el = $("#persistStatus");
  try {
    const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false;
    el.textContent = t(ok ? "data.persistOk" : "data.persistNo");
  } catch {
    el.textContent = t("data.persistNo");
  }
}

// ---------------------------------------------------------------- navigation & wiring
function go(next) {
  view = next;
  render();
  $("#main").focus({ preventScroll: true });
  window.scrollTo(0, 0);
  if (location.hash !== "#" + next) history.replaceState(null, "", "#" + next);
}

function bind() {
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
  $("#addCustomerBtn").addEventListener("click", openNewCustomer);
  $("#customerSearch").addEventListener("input", (e) => { query = e.target.value; renderKasbon(); });
  $("#addInBtn").addEventListener("click", () => openAmount("in"));
  $("#addOutBtn").addEventListener("click", () => openAmount("out"));
  $("#downloadBackupBtn").addEventListener("click", download);
  $("#shareBackupBtn").addEventListener("click", share);
  $("#restoreInput").addEventListener("change", (e) => restore(e.target));
  $("#sheetClose").addEventListener("click", closeSheet);
  $("#sheet").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeSheet(); });
  $("#sheet").addEventListener("close", () => { if (sheetOnClose) sheetOnClose(); });
  $("#settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const tpl = $("#templateInput").value.trim();
    const settings = {
      shop: $("#shopInput").value.trim(),
      lang: $("#langSelect").value,
      template: tpl && tpl !== t("wa.defaultTemplate") ? tpl : "",
    };
    setLang(settings.lang);
    applyStaticText();
    commit({ ...state, settings });
    toast(t("toast.settingsSaved"));
  });
  window.addEventListener("hashchange", () => {
    const v = location.hash.slice(1);
    if (["kasbon", "kas", "data"].includes(v) && v !== view) { view = v; render(); }
  });
  // Keep tabs in sync if another tab of the app changes data.
  window.addEventListener("storage", (e) => { if (e.key === S.STORAGE_KEY) { state = S.load(); render(); } });
}

function init() {
  setLang(state.settings.lang || (navigator.language || "id").slice(0, 2));
  applyStaticText();
  const v = location.hash.slice(1);
  if (["kasbon", "kas", "data"].includes(v)) view = v;
  bind();
  render();
  requestPersistence();
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
