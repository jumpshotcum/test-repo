#!/usr/bin/env python3
"""Build data/catalog.json from installed Claude Code plugins and skills.

Usage: python3 scripts/extract_catalog.py [PLUGIN_ROOT ...] --skills SKILL_ROOT ...
Only public metadata is kept (names, descriptions, versions, counts) - no local paths.
"""
import json, re, sys, pathlib, argparse, datetime

def frontmatter(text):
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.S)
    if not m:
        return {}
    out, key = {}, None
    for line in m.group(1).splitlines():
        kv = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if kv:
            key, val = kv.group(1), kv.group(2).strip()
            out[key] = val
        elif key and line.startswith((" ", "\t")):
            out[key] = (out[key] + " " + line.strip()).strip()
    for k, v in out.items():
        v = v.strip()
        if v in (">", "|", ">-", "|-"):
            v = ""
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        out[k] = v.replace('\\"', '"')
    return out

def clean(s, n=600):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"

def entries(base, pattern, kind):
    items = []
    for f in sorted(base.glob(pattern)):
        if "vendor" in f.parts or "node_modules" in f.parts:
            continue
        try:
            fm = frontmatter(f.read_text(encoding="utf-8", errors="replace"))
        except OSError:
            continue
        name = fm.get("name") or (f.parent.name if f.name == "SKILL.md" else f.stem)
        items.append({"name": name, "kind": kind, "description": clean(fm.get("description"))})
    return items

def plugin(d):
    meta = {}
    for p in (d / ".claude-plugin" / "plugin.json", d / "plugin.json"):
        if p.exists():
            try:
                meta = json.loads(p.read_text())
            except ValueError:
                pass
            break
    name = meta.get("name") or d.name
    author = meta.get("author")
    if isinstance(author, dict):
        author = author.get("name")
    skills = entries(d, "skills/*/SKILL.md", "skill") + entries(d, "SKILL.md", "skill")
    agents = entries(d, "agents/*.md", "agent")
    commands = entries(d, "commands/*.md", "command")
    hooks = (d / "hooks").is_dir() or (d / "hooks.json").exists()
    mcp = (d / ".mcp.json").exists()
    return {
        "name": name,
        "description": clean(meta.get("description"), 400),
        "version": meta.get("version", ""),
        "author": author or "",
        "homepage": meta.get("homepage", ""),
        "keywords": meta.get("keywords", [])[:8] if isinstance(meta.get("keywords"), list) else [],
        "skills": skills, "agents": agents, "commands": commands,
        "hasHooks": hooks, "hasMcp": mcp,
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plugin_roots", nargs="*")
    ap.add_argument("--skills", nargs="*", default=[])
    ap.add_argument("--out", default="data/catalog.json")
    a = ap.parse_args()
    plugins = []
    for root in a.plugin_roots:
        for d in sorted(pathlib.Path(root).iterdir()):
            if d.is_dir():
                p = plugin(d)
                if p["skills"] or p["agents"] or p["commands"]:
                    plugins.append(p)
    standalone = []
    for root in a.skills:
        standalone += entries(pathlib.Path(root), "*/SKILL.md", "skill")
    seen, uniq = set(), []
    for s in standalone:
        if s["name"] not in seen:
            seen.add(s["name"]); uniq.append(s)
    cats_file = pathlib.Path(__file__).with_name("categories.json")
    cats = json.loads(cats_file.read_text()) if cats_file.exists() else {}
    cmap = {n: k for k, v in cats.items() for n in v}
    for p in plugins:
        p["category"] = cmap.get(p["name"], "Other")
    for s in uniq:
        s["category"] = cmap.get(s["name"], "Other")
    plugins.sort(key=lambda p: p["name"].lower())
    data = {"generated": datetime.date.today().isoformat(), "categories": list(cats) + (["Other"] if "Other" in cmap.values() else []), "plugins": plugins, "standaloneSkills": sorted(uniq, key=lambda s: s["name"])}
    pathlib.Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(a.out).write_text(json.dumps(data, ensure_ascii=False, indent=1))
    ns = sum(len(p["skills"]) for p in plugins) + len(uniq)
    na = sum(len(p["agents"]) for p in plugins)
    print(f"{len(plugins)} plugins, {ns} skills, {na} agents -> {a.out}")

if __name__ == "__main__":
    main()
