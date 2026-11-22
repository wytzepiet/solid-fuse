#!/usr/bin/env bash
# JS-only runs in the Rust harness (libfjs/src/tests/bench_harness.rs): real engine,
# real fjs.bridge_call conversion, no Flutter.
#   tools/harness.sh <harness-binary> <cmds.jsonl> [out-file]
# env: FJS_BENCH_GC=<bytes|off>  FJS_BENCH_BYTECODE=1  BUNDLE=<path>
set -euo pipefail
cd "$(dirname "$0")/.."
bin=$1; cmds=$2; out=${3:-/dev/stdout}
{
  echo "# $(date -Is) harness=$bin gc=${FJS_BENCH_GC:-default} bytecode=${FJS_BENCH_BYTECODE:-0} loadavg=$(cut -d' ' -f1-3 /proc/loadavg)"
  FJS_BENCH_BUNDLE=${BUNDLE:-$PWD/dart/assets/js/bundle.js} FJS_BENCH_CMDS=$cmds "$bin" bench_harness --ignored --nocapture 2>&1 | grep -E '^HARNESS' || true
  echo "# end loadavg=$(cut -d' ' -f1-3 /proc/loadavg)"
} > "$out"
