#!/usr/bin/env bash
# Reruns report 09 end to end. About 35 minutes on 4 busy cores (each generator run resolves the
# Flutter element model: 25 to 60 s). Needs /opt/flutter, bun, tsc and network for the first pub get.
#   ./run.sh            everything
#   ./run.sh check      only tsc + flutter analyze + tables, on what is already generated
set -uo pipefail
cd "$(dirname "$0")"
export PATH=/opt/flutter/bin:$PATH
J=${JOBS:-3}
if [ "${1:-}" != "check" ]; then
  (cd host && flutter pub get | tail -1)
  (cd gen && dart pub get | tail -1)
  # widget generator (copy of wt/e2e packages/solid-fuse/gen, with fix 1 and fix 2 from the report)
  xargs -P"$J" -L1 scripts/gen_widgets.sh < scripts/ui_packages.txt
  # hand-written escape-hatch widgets in host/lib/fuse -> unit "app"
  (cd gen && dart run bin/fuse_gen.dart --job ../out/widgets/app.job.json > ../out/widgets/app.summary.json 2> ../out/widgets/app.log)
  # object + plugin-module generator (copy of experiments/interop/objects)
  xargs -P"$J" -L1 scripts/gen_module.sh < scripts/module_packages.txt
fi
bun scripts/emit_ts.ts                                   # manifests -> ts/generated/*.ts (cli/gen-emit.ts, unchanged)
python3 -I scripts/stats.py > out/widgets-table.md        # + out/widgets-stats.json
python3 -I scripts/module_stats.py > out/modules-table.md # + out/modules-stats.json
python3 -I scripts/table.py > out/package-table.md        # the table in the report (classes from classification.tsv)
echo "== tsc --strict: generated widget modules, wrappers, examples, generated plugin modules (3 known-bad excluded)"
(cd ts && tsc -p tsconfig.check.json && echo "tsc: no errors")
echo "== tsc --strict including the 3 known-bad generated modules"
(cd ts && tsc -p tsconfig.json | sed 's/(.*//' | sort | uniq -c)
echo "== flutter analyze: generated widget adapters + hand-written widgets"
(cd host && flutter analyze --no-fatal-infos --no-fatal-warnings lib/_generated lib/fuse 2>&1 | grep "error •\|issues found\|No issues")
echo "== flutter analyze: generated plugin modules"
(cd host && flutter analyze --no-fatal-infos --no-fatal-warnings lib/generated 2>&1 | grep "error •\|issues found\|No issues")
