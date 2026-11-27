(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const state = { q: "", cat: "all", kind: "all", sort: "name", open: "" };
  let entries = [];
  let categories = [];

  // Tiny DOM builder: h("div", {class: "x"}, child, "text", ...). Text is always set as text nodes.
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  function svgIcon(d, size, attrs) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
    svg.append(p);
    return svg;
  }

  const tokens = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Returns a DocumentFragment with matched tokens wrapped in <mark>.
  function highlight(text, toks) {
    const frag = document.createDocumentFragment();
    text = String(text ?? "");
    if (!toks.length) { frag.append(text); return frag; }
    const re = new RegExp("(" + toks.map(reEsc).join("|") + ")", "gi");
    text.split(re).forEach((part, i) => {
      if (!part) return;
      frag.append(i % 2 ? h("mark", null, part) : document.createTextNode(part));
    });
    return frag;
  }

  // Normalise plugins and standalone skills into one entry shape.
  function normalise(data) {
    const list = data.plugins.map((p) => ({
      id: p.name, name: p.name, standalone: false, category: p.category || "Other",
      description: p.description, version: p.version, author: p.author, homepage: p.homepage,
      hasHooks: p.hasHooks, hasMcp: p.hasMcp,
      items: [
        ...p.skills.map((s) => ({ ...s, kind: "skill" })),
        ...p.agents.map((s) => ({ ...s, kind: "agent" })),
        ...p.commands.map((s) => ({ ...s, kind: "command" })),
      ],
    }));
    for (const s of data.standaloneSkills) {
      list.push({
        id: "skill:" + s.name, name: s.name, standalone: true, category: s.category || "Other",
        description: s.description, version: "", author: "", homepage: "", hasHooks: false, hasMcp: false,
        items: [{ ...s, kind: "skill" }],
      });
    }
    for (const e of list) {
      e.hay = (e.name + " " + e.description + " " + e.category).toLowerCase();
      for (const it of e.items) it.hay = (it.name + " " + it.description).toLowerCase();
    }
    return list;
  }

  function invocation(entry, item) {
    if (entry.standalone) return "/" + item.name;
    const id = item.name.includes(":") ? item.name : entry.name + ":" + item.name;
    return item.kind === "agent" ? id : "/" + id;
  }

  function filtered() {
    const toks = tokens(state.q);
    const out = [];
    for (const e of entries) {
      if (state.cat !== "all" && e.category !== state.cat) continue;
      const items = state.kind === "all" ? e.items : e.items.filter((i) => i.kind === state.kind);
      if (!items.length) continue;
      if (!toks.length) { out.push({ e, hits: [], score: 0 }); continue; }
      const hits = items.filter((i) => toks.every((t) => i.hay.includes(t) || e.hay.includes(t)) && toks.some((t) => i.hay.includes(t)));
      const selfMatch = toks.every((t) => e.hay.includes(t));
      if (!selfMatch && !hits.length) continue;
      const nameHit = toks.every((t) => e.name.toLowerCase().includes(t));
      out.push({ e, hits, score: (nameHit ? 100 : 0) + (selfMatch ? 10 : 0) + hits.length });
    }
    const byName = (a, b) => a.e.name.localeCompare(b.e.name);
    if (state.sort === "size") out.sort((a, b) => b.e.items.length - a.e.items.length || byName(a, b));
    else if (state.sort === "category") out.sort((a, b) => categories.indexOf(a.e.category) - categories.indexOf(b.e.category) || byName(a, b));
    else out.sort(byName);
    if (toks.length) out.sort((a, b) => b.score - a.score); // stable: ties keep chosen order
    return out;
  }

  function counts(e) {
    const c = { skill: 0, agent: 0, command: 0 };
    for (const i of e.items) c[i.kind]++;
    return c;
  }

  function tags(e) {
    const c = counts(e);
    const out = Object.keys(c).filter((k) => c[k]).map((k) => h("span", { class: "tag tag--" + k }, c[k] + " " + k));
    if (e.standalone) out.push(h("span", { class: "tag tag--flag" }, "mandiri"));
    if (e.hasHooks) out.push(h("span", { class: "tag tag--flag" }, "hooks"));
    if (e.hasMcp) out.push(h("span", { class: "tag tag--flag" }, "MCP"));
    return out;
  }

  function renderStats() {
    const plugins = entries.filter((e) => !e.standalone).length;
    const tot = { skill: 0, agent: 0, command: 0 };
    for (const e of entries) { const n = counts(e); for (const k in tot) tot[k] += n[k]; }
    $("#stats").replaceChildren(...[["Plugin", plugins], ["Skill", tot.skill], ["Agent", tot.agent], ["Command", tot.command]]
      .map(([k, v]) => h("div", null, h("dt", null, k), h("dd", null, v))));
  }

  function renderChips() {
    const n = (cat) => entries.filter((e) => cat === "all" || e.category === cat).length;
    $("#categories").replaceChildren(...["all", ...categories].filter((c) => n(c)).map((c) =>
      h("button", { type: "button", class: "chip", "data-cat": c, "aria-pressed": String(state.cat === c) },
        c === "all" ? "Semua kategori" : c, h("span", { class: "n" }, n(c)))));
  }

  function card(e, hits, toks) {
    const top = h("span", { class: "card__top" }, h("span", { class: "card__cat" }, e.category),
      e.version ? h("span", { class: "card__ver" }, "v" + e.version) : null);
    let note = null;
    if (toks.length && hits.length) {
      note = h("span", { class: "match" }, "Cocok: ");
      hits.slice(0, 3).forEach((hit, i) => { if (i) note.append(", "); note.append(h("b", null, highlight(hit.name, toks))); });
      if (hits.length > 3) note.append(" +" + (hits.length - 3));
    }
    return h("button", { type: "button", class: "card", "data-id": e.id, "aria-haspopup": "dialog" },
      top,
      h("h3", null, highlight(e.name, toks)),
      h("p", null, highlight(e.description || e.items[0]?.description || "Tanpa deskripsi.", toks)),
      note,
      h("span", { class: "card__tags" }, tags(e)));
  }

  function render() {
    const toks = tokens(state.q);
    const rows = filtered();
    $("#results").replaceChildren(...rows.map(({ e, hits }) => card(e, hits, toks)));
    $("#count").textContent = rows.length ? `Menampilkan ${rows.length} dari ${entries.length} entri` : "";
    $("#empty").hidden = rows.length > 0;
    document.querySelectorAll("#kindFilter button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === state.kind)));
    document.querySelectorAll("#categories .chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat)));
    writeHash();
  }

  function openDetail(id) {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    state.open = id;
    const toks = tokens(state.q);
    $("#detailCat").textContent = e.category + (e.standalone ? " · skill mandiri" : " · plugin");
    $("#detailTitle").textContent = e.name;

    const meta = $("#detailMeta");
    meta.replaceChildren();
    const parts = [];
    if (e.version) parts.push("v" + e.version);
    if (e.author) parts.push("oleh " + e.author);
    if (/^https:\/\//.test(e.homepage || "")) parts.push(h("a", { href: e.homepage, target: "_blank", rel: "noopener noreferrer" }, "Homepage ↗"));
    parts.forEach((p, i) => { if (i) meta.append(" · "); meta.append(p); });

    $("#detailDesc").textContent = e.standalone ? "" : e.description;

    const groups = [["skill", "Skill"], ["agent", "Agent"], ["command", "Command"]].map(([k, label]) => {
      const items = e.items.filter((i) => i.kind === k);
      if (!items.length) return null;
      return h("section", { class: "group" },
        h("h3", null, `${label} (${items.length})`),
        h("ul", { class: "items" }, items.map((i) => {
          const inv = invocation(e, i);
          return h("li", null,
            h("div", { class: "item__head" },
              h("span", { class: "item__name" }, highlight(i.name, toks)),
              h("button", { type: "button", class: "copy", "data-copy": inv, "aria-label": "Salin " + inv },
                svgIcon("M9 9h10v10H9zM5 15V5h10", 14, { fill: "none", stroke: "currentColor", "stroke-width": "2" }),
                h("span", null, inv))),
            h("p", { class: "item__desc" }, highlight(i.description || "Tanpa deskripsi.", toks)));
        })));
    });
    $("#detailBody").replaceChildren(...groups.filter(Boolean));

    const dlg = $("#detail");
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    writeHash();
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 1600);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Disalin: " + text);
    } catch (err) {
      const ta = h("textarea", { "aria-hidden": "true" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      toast(ok ? "Disalin: " + text : "Gagal menyalin — salin manual: " + text);
    }
  }

  function writeHash() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.cat !== "all") p.set("cat", state.cat);
    if (state.kind !== "all") p.set("kind", state.kind);
    if (state.sort !== "name") p.set("sort", state.sort);
    if (state.open) p.set("open", state.open);
    const str = p.toString();
    history.replaceState(null, "", str ? "#" + str : location.pathname + location.search);
  }

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.q = p.get("q") || "";
    state.cat = categories.includes(p.get("cat")) ? p.get("cat") : "all";
    state.kind = ["skill", "agent", "command"].includes(p.get("kind")) ? p.get("kind") : "all";
    state.sort = ["name", "size", "category"].includes(p.get("sort")) ? p.get("sort") : "name";
    state.open = p.get("open") || "";
    $("#q").value = state.q;
    $("#sort").value = state.sort;
  }

  function bind() {
    let timer;
    $("#q").addEventListener("input", (ev) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = ev.target.value.trim(); render(); }, 80);
    });
    $("#sort").addEventListener("change", (ev) => { state.sort = ev.target.value; render(); });
    $("#kindFilter").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (b) { state.kind = b.dataset.kind; render(); }
    });
    $("#categories").addEventListener("click", (ev) => {
      const b = ev.target.closest(".chip");
      if (b) { state.cat = b.dataset.cat; render(); }
    });
    $("#results").addEventListener("click", (ev) => {
      const c = ev.target.closest(".card");
      if (c) openDetail(c.dataset.id);
    });
    $("#reset").addEventListener("click", () => {
      Object.assign(state, { q: "", cat: "all", kind: "all" });
      $("#q").value = "";
      render();
      $("#q").focus();
    });
    $("#closeDetail").addEventListener("click", () => $("#detail").close());
    $("#detail").addEventListener("click", (ev) => {
      if (ev.target === ev.currentTarget) ev.currentTarget.close();
      const b = ev.target.closest(".copy");
      if (b) copy(b.dataset.copy);
    });
    $("#detail").addEventListener("close", () => {
      const id = state.open;
      state.open = "";
      writeHash();
      const back = [...document.querySelectorAll(".card")].find((c) => c.dataset.id === id);
      if (back) back.focus();
    });
    document.addEventListener("keydown", (ev) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
      if (ev.key === "/" && !typing && !$("#detail").open) { ev.preventDefault(); $("#q").focus(); }
    });
    $("#themeToggle").addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
    });
  }

  async function init() {
    bind();
    try {
      const res = await fetch("data/catalog.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      categories = data.categories || [];
      entries = normalise(data);
      if (data.generated) $("#generated").textContent = "Diperbarui " + data.generated + ".";
    } catch (err) {
      $("#error").hidden = false;
      return;
    }
    readHash();
    renderStats();
    renderChips();
    render();
    if (state.open) openDetail(state.open);

    // React to hash edits on an already-loaded page (pasted link, address bar, back/forward).
    window.addEventListener("hashchange", () => {
      readHash();
      const want = state.open;
      render();
      const dlg = $("#detail");
      if (want) openDetail(want);
      else if (dlg.open) dlg.close();
    });
  }

  init();
})();
