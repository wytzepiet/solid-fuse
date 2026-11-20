#!/usr/bin/env python3
"""Aggregates reviews/*.json (rubric verdicts from reviewer agents) into results/semantic.md/.json."""
import json, glob, os, collections, re
E = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rub = json.load(open(f"{E}/review/rubrics.json"))
rows = []
for f in sorted(glob.glob(f"{E}/reviews/*.json")):
    style, cond, task = re.match(r"([hm])-(\w+?)-(\d-.*)\.json", os.path.basename(f)).groups()
    for name, r in json.load(open(f)).items():
        crit = r["criteria"]
        v = [c["v"] for c in crit]
        tags = [t for c in crit for t in c.get("tags", [])]
        only_grow = [c for c in crit if c["v"] == "fail" and "grow-loose" in c.get("tags", [])]
        rows.append(dict(style=style, cond=cond, task=task, file=os.path.basename(name), n=len(v),
                         passed=v.count("pass"), partial=v.count("partial"), failed=v.count("fail"),
                         failed_grow=len(only_grow), runtime=r["runtime"]["v"], runtime_why=r["runtime"].get("why", ""),
                         notes=r.get("notes", ""), fails=[(c["n"], c["v"], c.get("why", ""), c.get("tags", [])) for c in crit if c["v"] != "pass"]))
json.dump(rows, open(f"{E}/results/semantic.json", "w"), indent=1)
out = []
for cond in ("gist", "cold", "types"):
    for style in "hm":
        rs = [r for r in rows if r["style"] == style and r["cond"] == cond]
        if not rs: continue
        n = sum(r["n"] for r in rs)
        out.append(f"## {style.upper()} / {cond}: files={len(rs)} criteria={n} pass={sum(r['passed'] for r in rs)} ({100*sum(r['passed'] for r in rs)/n:.0f}%) partial={sum(r['partial'] for r in rs)} fail={sum(r['failed'] for r in rs)} (of which grow-loose only: {sum(r['failed_grow'] for r in rs)}) "
                   f"all-pass files={sum(r['passed']==r['n'] for r in rs)} no-fail files={sum(r['failed']==0 for r in rs)} runtime: {dict(collections.Counter(r['runtime'] for r in rs))}")
        for t in sorted(rub):
            tr = [r for r in rs if r["task"] == t]
            out.append(f"  {t:18s} " + "  ".join(f"{r['passed']}/{r['n']}{'!' if r['runtime']=='throws' else ''}" for r in tr))
open(f"{E}/results/semantic.md", "w").write("\n".join(out) + "\n")
print("\n".join(out))
