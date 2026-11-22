#!/usr/bin/env python3
"""Report 15 tables from `core` suite BENCH lines, pooled over passes.

    python3 tools/r15-agg.py "off=results/r15/core-s0-p*.txt" "on=results/r15/core-s1-p*.txt"

One table per label: median (min-max) in ms over all timing reps of all files
(the detail pass is used only for op counts, bytes and stringify time), then a
frame-phase table. "UI" is decode + apply + frame, as in reports 11 and 14.
"""
import glob, json, sys
from statistics import median

ORDER = ["mount_200", "mount_1000", "mount_5000", "list_replace_500", "update_t1", "update_t50", "update_t1000",
         "update_c1000", "list_sort_2000", "list_shuffle_2000", "list_reverse_2000", "list_filter_2000_to_1000"]

def load(pattern):
    recs, checks, loads, counts, errors = {}, [0, 0], [], {}, 0
    files = sorted(glob.glob(pattern))
    for path in files:
        for line in open(path):
            if line.startswith("BENCH_ERROR") or line.startswith("[Fuse] ops error"):
                errors += 1
            if not line.startswith("BENCH {"):
                continue
            d = json.loads(line[6:])
            if d.get("suite") != "core":
                continue
            if d["name"] == "list_order_check":
                checks[1] += 1
                checks[0] += 1 if d.get("dartTreeMatchesJs") else 0
                continue
            if d["name"] == "tree_counts":
                counts[d["what"]] = d
                continue
            try:
                loads.append(float(d.get("load")))
            except (TypeError, ValueError):
                pass
            recs.setdefault(d["name"], []).append(d)
    return recs, checks, loads, counts, errors, files

def ui(d):
    if "uiFrameMs" not in d:
        return None
    return d.get("decodeMs", 0) + d.get("applyMs", 0) + d["uiFrameMs"]

def col(rs, fn):
    v = [fn(r) for r in rs if not r.get("detail")]
    return [x for x in v if isinstance(x, (int, float))]

def fmt(v, rng=True):
    if not v:
        return "–"
    m = median(v)
    nd = 0 if m >= 100 else (1 if m >= 10 else 2)
    s = f"{m:.{nd}f}"
    if rng:
        s += f" ({min(v):.{nd}f}–{max(v):.{nd}f})"
    return s

COLS = [("JS", lambda d: d.get("jsMs")), ("bridge_call", lambda d: d.get("sendMs")),
        ("decode", lambda d: d.get("decodeMs")), ("jsonDecode", lambda d: d.get("jsonDecodeMs")),
        ("apply", lambda d: d.get("applyMs")), ("frame", lambda d: d.get("uiFrameMs")), ("UI", ui),
        ("e2e", lambda d: d.get("e2eMs"))]
PH = ["buildMs", "layoutMs", "paintMs", "semanticsMs", "restMs", "preDrawMs"]

for arg in sys.argv[1:]:
    label, pattern = arg.split("=", 1)
    recs, checks, loads, counts, errors, files = load(pattern)
    if not loads:
        print(f"### {label}: no records in {pattern}\n")
        continue
    print(f"### {label}  ({len(files)} files, load {min(loads):.2f}–{max(loads):.2f}, median {median(loads):.2f}; "
          f"order checks {checks[0]}/{checks[1]}; error lines {errors})\n")
    print("| Operation | ops | bytes | n | " + " | ".join(c for c, _ in COLS) + " |")
    print("|---|---:|---:|---:|" + "---:|" * len(COLS))
    for name in ORDER:
        rs = recs.get(name)
        if not rs:
            continue
        det = [r for r in rs if r.get("detail")]
        ops = det[0].get("ops") if det else "–"
        by = rs[0].get("bytes", "–")
        n = len([r for r in rs if not r.get("detail")])
        print(f"| {name} | {ops} | {by} | {n} | " + " | ".join(fmt(col(rs, fn)) for _, fn in COLS) + " |")
    print("\n| Operation | " + " | ".join(p[:-2] for p in PH) + " | stringify (detail pass) | elements | render objects |")
    print("|---|" + "---:|" * (len(PH) + 3))
    for name in ORDER:
        rs = recs.get(name)
        if not rs:
            continue
        det = [r.get("stringifyMs") for r in rs if r.get("detail") and r.get("stringifyMs") is not None]
        c = counts.get(name, {})
        print(f"| {name} | " + " | ".join(fmt(col(rs, lambda d, p=p: d.get(p)), False) for p in PH)
              + f" | {fmt(det, False)} | {c.get('elements', '–')} | {c.get('renderObjects', '–')} |")
    print()
