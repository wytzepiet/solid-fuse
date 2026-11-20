#!/usr/bin/env python3
"""Runs tsc in both sandboxes and writes results/errors.json + results/summary.md.

Each diagnostic is attributed to its attempt file and auto-categorised from the TS
code + message + offending source line; results/overrides.json (hand review) can
re-label individual diagnostics by "<style>/<cond>/<file>:<line>:<col>".
"""
import json, os, re, subprocess, collections, sys
E = os.path.dirname(os.path.abspath(__file__))
CATS = ["unknown-component", "unknown-prop", "value-shape", "enum-string", "missing-required",
        "dollar-tag", "flex-children", "callback-payload", "icon-name", "solid-ts"]

def tsc(style):
    p = subprocess.run(["tsc", "-p", ".", "--pretty", "false"], cwd=f"{E}/sandbox-{style}" if style != "hs" else f"{E}/sandbox-h-strict", capture_output=True, text=True)
    diags, cur = [], None
    for line in p.stdout.splitlines():
        m = re.match(r"^(?:\.\./sandbox-h/)?(attempts/[^(]+)\((\d+),(\d+)\): error (TS\d+): (.*)$", line)
        if m:
            cur = dict(file=m[1], line=int(m[2]), col=int(m[3]), code=m[4], msg=m[5], more=[])
            diags.append(cur)
        elif line.startswith(" ") and cur: cur["more"].append(line.strip())
        elif line.strip(): print("UNPARSED", style, line, file=sys.stderr)
    return diags

def categorise(style, d, src):
    code, msg, full = d["code"], d["msg"], d["msg"] + " " + " ".join(d["more"])
    if code in ("TS2305", "TS2724", "TS2614", "TS2304", "TS2552"):
        if re.search(r"icons/(material|cupertino)", msg): return "icon-name"
        if "solid-js" in msg: return "solid-ts"
        return "unknown-component"
    if code in ("TS7006", "TS7031", "TS7053", "TS2345", "TS2769", "TS18048", "TS2532", "TS18047", "TS2554", "TS2349", "TS2367", "TS6133", "TS2531"):
        return "solid-ts"
    if code == "TS2339":  # property does not exist on type
        if re.search(r"(Details|Out|Event)\w*'", msg): return "callback-payload"
        return "solid-ts"
    if code == "TS2741" or "is missing in type" in full or "are missing in type" in full:
        if "'$'" in full or '"$"' in full: return "dollar-tag"
        return "missing-required"
    if code in ("TS2322", "TS2353", "TS2559", "TS2820", "TS2326", "TS2739", "TS2740", "TS2561"):
        m = re.search(r"Property '(\w+)' does not exist on type '(?:IntrinsicAttributes & )?(\w+Props)'", full)
        if m:
            if m[1] in ("flex", "grow", "child", "children", "gap", "body", "content"): return "flex-children"
            return "unknown-prop"
        if "'children'" in full and ("FuseText" in full or "FuseElement" in full or "FuseChildren" in full or "children" in msg):
            return "flex-children"
        if "$" in src or "'$'" in full or '$:' in full.split("is not assignable to type")[0]:
            return "dollar-tag"
        if re.match(r"Type '\"[^\"]*\"' is not assignable", msg) or re.match(r"Type 'string' is not assignable", msg):
            return "enum-string"
        return "value-shape"
    return "solid-ts"

def main():
    ov_path = f"{E}/results/overrides.json"
    overrides = json.load(open(ov_path)) if os.path.exists(ov_path) else {}
    os.makedirs(f"{E}/results", exist_ok=True)
    rows, alld = [], []
    for style in ("h", "m", "hs"):
        diags = tsc(style)
        by = collections.defaultdict(list)
        for d in diags: by[d["file"]].append(d)
        for cond in ("gist", "cold", "types"):
            adir = f"{E}/sandbox-{style if style != 'hs' else 'h'}/attempts/{cond}"
            for f in sorted(os.listdir(adir)) if os.path.isdir(adir) else []:
                rel = f"attempts/{cond}/{f}"
                lines = open(f"{adir}/{f}").read().splitlines()
                cats = collections.Counter()
                for d in by.get(rel, []):
                    src = lines[d["line"] - 1] if d["line"] <= len(lines) else ""
                    key = f"{style}/{cond}/{f}:{d['line']}:{d['col']}"
                    d.update(style=style, cond=cond, key=key, src=src.strip(), cat=overrides.get(key) or categorise(style, d, src))
                    cats[d["cat"]] += 1; alld.append(d)
                rows.append(dict(style=style, cond=cond, file=f, task=f.rsplit("-", 1)[0], errors=len(by.get(rel, [])), cats=dict(cats), loc=len(lines)))
    json.dump(dict(rows=rows, diags=alld), open(f"{E}/results/errors.json", "w"), indent=1)
    out = []
    for cond in ("gist", "cold", "types"):
        for style in ("h", "hs", "m"):
            rs = [r for r in rows if r["style"] == style and r["cond"] == cond]
            if not rs: continue
            clean = sum(r["errors"] == 0 for r in rs); tot = sum(r["errors"] for r in rs)
            cc = collections.Counter(); [cc.update(r["cats"]) for r in rs]
            out.append(f"## {style.upper()} / {cond}: n={len(rs)} clean={clean} ({100*clean/len(rs):.0f}%) errors={tot} mean={tot/len(rs):.2f} median_loc={sorted(r['loc'] for r in rs)[len(rs)//2]}")
            out.append("  cats: " + ", ".join(f"{k}={v}" for k, v in cc.most_common()))
            tasks = sorted({r["task"] for r in rs})
            for t in tasks:
                tr = [r for r in rs if r["task"] == t]
                out.append(f"  {t:18s} " + " ".join(f"{r['errors']:2d}" for r in tr))
    open(f"{E}/results/summary.md", "w").write("\n".join(out) + "\n")
    print("\n".join(out))
if __name__ == "__main__": main()
