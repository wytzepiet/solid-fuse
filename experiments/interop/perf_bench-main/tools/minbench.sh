#!/usr/bin/env bash
S=/tmp/claude-0/-home-claude/abb9ed47-0cbe-55cd-9575-dfe5faa1e27d/scratchpad
rounds=$1; shift; out=$S/minout.txt; : > $out
for r in $(seq $rounds); do for b in "$@"; do
  FJS_BENCH_BUNDLE=$S/bundles/$b.js FJS_BENCH_CMDS=$S/cmds-min.jsonl $S/target-o3/release/deps/fjs-bc2879a9a535ade5 bench_harness --ignored --nocapture 2>&1 | grep -E '^HARNESS \{' | sed "s/^/$r $b /" >> $out
done; done
python3 - $out "$@" <<'PY'
import sys, json, statistics as st, collections
d=collections.defaultdict(list)
for line in open(sys.argv[1]):
    r,b,_,rest=line.split(" ",3); j=json.loads(rest); o=j["out"]; k=j["in"]["cmd"]
    if "jsMs" in o and k!="clear": d[(k,b,r)].append(o["jsMs"])
for k in ("mount","updPrep"):
    print(k)
    for b in sys.argv[2:]:
        mins=[min(v) for (kk,bb,r),v in d.items() if kk==k and bb==b]
        meds=[st.median(v) for (kk,bb,r),v in d.items() if kk==k and bb==b]
        print("  %-8s per-process min: median %.1f [%.1f-%.1f]   per-process median: median %.1f  (n=%d processes)"%(b,st.median(mins),min(mins),max(mins),st.median(meds),len(mins)))
PY
