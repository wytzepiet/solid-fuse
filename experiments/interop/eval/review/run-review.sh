#!/usr/bin/env bash
# usage: run-review.sh <h|m> <cond> <task>
set -u
style=$1; cond=$2; task=$3
E=/home/claude/solid-fuse/experiments/interop/eval; SP=${EVAL_SCRATCH:?}
out=$E/reviews/$style-$cond-$task.json
[ -s "$out" ] && exit 0
work=$SP/review/$style-$cond-$task; rm -rf "$work"; mkdir -p "$work"
cp $E/sandbox-$style/attempts/$cond/$task-*.tsx "$work/"
export PRIMER="$(cat $E/prompts/primer-$style.md)" NOTES="$(cat $E/review/notes-$style.md)" TASK="$(cat $E/tasks/$task.md)" REF="$SP/sbx-$style" OUT="$work/review.json"
export FILES="$(cd $work && ls *.tsx | sed "s#^#$work/#" | tr '\n' ' ')"
export CRITERIA="$(python3 -c 'import json,sys;[print(f"{i+1}. {c}") for i,c in enumerate(json.load(open(sys.argv[1]))[sys.argv[2]])]' $E/review/rubrics.json $task)"
prompt=$(python3 - "$E/review/template.md" <<'PY'
import os,sys
t=open(sys.argv[1]).read()
for k in ("PRIMER","NOTES","TASK","CRITERIA","FILES","OUT","REF"): t=t.replace("{{%s}}"%k, os.environ[k].strip())
print(t)
PY
)
cd "$work"
timeout 1200 claude -p "$prompt" --model claude-fable-5-2 --tools "Read,Grep,Glob,Write" --allowedTools "Read,Grep,Glob,Write" --strict-mcp-config --output-format stream-json --verbose > "$E/logs/review-$style-$cond-$task.jsonl" 2>/dev/null
if python3 -c 'import json,sys;json.load(open(sys.argv[1]))' "$work/review.json" 2>/dev/null; then cp "$work/review.json" "$out"; echo "ok $style $cond $task"; else echo "BAD $style $cond $task"; fi
