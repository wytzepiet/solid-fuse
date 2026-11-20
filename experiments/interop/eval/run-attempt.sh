#!/usr/bin/env bash
# usage: run-attempt.sh <h|m> <cold|types> <task-file-basename> <n>
# Spawns one fresh headless agent (claude -p) outside the repo, lets it write one .tsx,
# then copies the file into sandbox-<style>/attempts/<cond>/ and the transcript into logs/.
set -u
style=$1; cond=$2; task=$3; n=$4
E=/home/claude/solid-fuse/experiments/interop/eval
SP=${EVAL_SCRATCH:?}
id="$task-$n"
out_dir=$E/sandbox-$style/attempts/$cond
[ -s "$out_dir/$id.tsx" ] && exit 0
work=$SP/run/$style-$cond/$id; rm -rf "$work"; mkdir -p "$work" "$out_dir" "$E/logs/$style-$cond"
ref=$SP/sbx-$style
pfile=$E/prompts/primer-$style.md; afile=$E/prompts/access-$cond.md
if [ "$cond" = gist ]; then pfile=$E/prompts/primer-$style-gist.md; afile=$E/prompts/access-cold.md; fi
export PRIMER="$(cat $pfile)" TASK="$(cat $E/tasks/$task.md)" OUT="$work/attempt.tsx" REF="$ref"
export ACCESS="$(python3 -c 'import os,sys;print(open(sys.argv[1]).read().strip().replace("{{REF}}",os.environ["REF"]))' $afile)"
prompt=$(python3 - "$E/prompts/template.md" <<'PY'
import os,sys
t=open(sys.argv[1]).read()
for k in ("PRIMER","ACCESS","TASK","OUT"): t=t.replace("{{%s}}"%k, os.environ[k].strip())
print(t)
PY
)
if [ "$cond" != types ]; then tools="Write"; else tools="Read,Grep,Glob,Write"; fi
cd "$work"
timeout 900 claude -p "$prompt" --model claude-fable-5-2 --tools "$tools" --allowedTools "$tools" --strict-mcp-config \
  --output-format stream-json --verbose > "$E/logs/$style-$cond/$id.jsonl" 2> "$E/logs/$style-$cond/$id.err"
if [ -s "$work/attempt.tsx" ]; then cp "$work/attempt.tsx" "$out_dir/$id.tsx"; echo "ok $style $cond $id"; else echo "MISSING $style $cond $id"; fi
