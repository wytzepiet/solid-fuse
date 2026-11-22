#!/usr/bin/env bash
# Report 15: the core suite in interleaved passes, semantics off and on.
#   tools/r15-run.sh <passes> <reps> [tag]
# Each pass runs the suite once with BENCH_SEMANTICS=0 and once with 1 (the
# order alternates), <reps> repetitions each. Output:
# results/r15/core-s<sem>-p<pass><tag>.txt. Waits for the 1-minute load average
# to drop below LOADMAX (0.5) before each run; an empty output (xvfb did not
# start) is retried up to three times. The detail pass (op counts, bytes) runs
# in pass 1 only.
set -euo pipefail
cd "$(dirname "$0")/.."
passes=${1:-5}; reps=${2:-3}; tag=${3:-}
for p in $(seq 1 "$passes"); do
  if (( p % 2 )); then order="0 1"; else order="1 0"; fi
  for sem in $order; do
    out="results/r15/core-s$sem-p$p$tag.txt"
    for try in 1 2 3; do
      until awk -v m="${LOADMAX:-0.5}" '{exit !($1 < m)}' /proc/loadavg; do sleep 5; done
      DETAIL=$([ "$p" = 1 ] && echo 1 || echo 0) BENCH_SEMANTICS=$sem tools/run.sh "${SUITE:-core}" "$reps" "$out"
      grep -q '^BENCH' "$out" && break
    done
  done
done
