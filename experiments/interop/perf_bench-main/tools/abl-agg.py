#!/usr/bin/env python3
"""Tables from tools/harness.sh output. Medians; the first two reps of each
variant are dropped as warm-up.   python3 tools/abl-agg.py out-a.txt [out-b.txt ...]"""
import json, sys, os
from statistics import median
def load(p):
    abl, micro, mount = {}, {}, {}
    for line in open(p):
        if not line.startswith("HARNESS {"): continue
        d = json.loads(line[8:])
        i, o = d["in"], d["out"]
        if i["cmd"] == "abl":
            runs = o["runs"][2:]
            abl[(i["v"], i["cards"])] = dict(js=median(r["jsMs"] for r in runs), send=median(r["sendMs"] for r in runs),
                str=median(r["strMs"] for r in runs), lo=min(r["jsMs"] for r in runs), hi=max(r["jsMs"] for r in runs),
                ops=runs[0]["ops"], bytes=runs[0]["bytes"], heap=d["heap1"] - d["heap0"])
        elif i["cmd"] == "micro":
            runs = o["runs"][2:]
            micro[i["m"]] = dict(ns=median(r["nsPerIter"] for r in runs), flush=median(r["flushNsPerIter"] for r in runs),
                send=median(r["sendNsPerIter"] for r in runs), ops=runs[0]["ops"] / i["n"])
        elif i["cmd"] == "mount":
            mount.setdefault(i["nodes"], []).append((o["jsMs"], o["sendMs"], d["heap1"] - d["heap0"], d["obj1"] - d["obj0"]))
    return abl, micro, mount
data = [(os.path.basename(p), *load(p)) for p in sys.argv[1:]]
names = [d[0].replace(".txt", "") for d in data]
print("**Mount via the app's own command** (jsMs / of which bridge_call), median\n")
print("| nodes | " + " | ".join(names) + " |"); print("|---|" + "---:|" * len(names))
for n in sorted({k for d in data for k in d[3]}):
    cells = []
    for d in data:
        v = d[3].get(n, [])[1:]
        cells.append(f"{median(x[0] for x in v):.1f} / {median(x[1] for x in v):.1f}" if v else "–")
    print(f"| {n} | " + " | ".join(cells) + " |")
print("\n**Ablation variants**: total JS ms / bridge ms (µs per op excluding bridge)\n")
print("| variant | cards | ops | " + " | ".join(names) + " |"); print("|---|---:|---:|" + "---:|" * len(names))
keys = []
for d in data:
    for k in d[1]:
        if k not in keys: keys.append(k)
for k in keys:
    cells = []; ops = None
    for d in data:
        a = d[1].get(k)
        if not a: cells.append("–"); continue
        ops = a["ops"]
        per = (a["js"] - a["send"]) * 1000 / max(1, a["ops"] if a["ops"] else 3731)
        cells.append(f"{a['js']:.1f} / {a['send']:.1f} ({per:.1f})" + (f" str {a['str']:.1f}" if a["str"] else ""))
    print(f"| {k[0]} | {k[1]} | {ops} | " + " | ".join(cells) + " |")
print("\n**Micro**: µs per iteration: body + Solid flush (bridge excluded)\n")
print("| micro | ops/iter | " + " | ".join(names) + " |"); print("|---|---:|" + "---:|" * len(names))
keys = []
for d in data:
    for k in d[2]:
        if k not in keys: keys.append(k)
for k in keys:
    cells = []; ops = 0
    for d in data:
        m = d[2].get(k)
        if not m: cells.append("–"); continue
        ops = m["ops"]
        cells.append(f"{m['ns']/1000:.2f} + {m['flush']/1000:.2f}")
    print(f"| {k} | {ops:.0f} | " + " | ".join(cells) + " |")
