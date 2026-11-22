#!/usr/bin/env bash
# Runs benchmark suites in the built Linux app under xvfb and saves the BENCH lines.
#   tools/run.sh <suites> <reps> <out-file> [release|profile]
# e.g. tools/run.sh part1 7 results/part1-a.txt
# Build first: `bun fuse build linux --release --no-tree-shake-icons` (bundle + Flutter build).
# BENCH_SEMANTICS=0 turns semantics off (see BenchBinding); the Linux embedder has it on.
# NICE=-10 (root only) raises priority so other jobs on the machine disturb the run less.
set -euo pipefail
cd "$(dirname "$0")/.."
suites=${1:-part1}; reps=${2:-5}; out=${3:-results/out.txt}; mode=${4:-release}
bin=${BIN:-dart/build/linux/x64/$mode/bundle/perf_bench}
mkdir -p "$(dirname "$out")"
{
  echo "# $(date -Is) suites=$suites reps=$reps mode=$mode semantics=${BENCH_SEMANTICS:-1} nice=${NICE:-0} loadavg=$(cut -d' ' -f1-3 /proc/loadavg)"
  DETAIL=${DETAIL:-1} BENCH_SEMANTICS=${BENCH_SEMANTICS:-1} BENCH=$suites REPS=$reps nice -n "${NICE:-0}" xvfb-run -a "$bin" 2>&1 | grep --line-buffered -E '^(BENCH|HARNESS|\[Fuse\] ops error|#[0-9])' || true
  echo "# end $(date -Is) loadavg=$(cut -d' ' -f1-3 /proc/loadavg)"
} > "$out"
