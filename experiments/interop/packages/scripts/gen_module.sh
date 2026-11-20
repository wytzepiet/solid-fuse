#!/usr/bin/env bash
# usage: gen_module.sh <unit> <lib-file> [<extra-lib-file> ...]   object + plugin-module generator (copy of experiments/interop/objects)
set -uo pipefail
ROOT=/home/claude/solid-fuse/experiments/interop/packages
export PATH=/opt/flutter/bin:$PATH
name=$1; shift
args=""; for l in "$@"; do p=$(echo "${name}_$(basename "$l" .dart)" | tr -c 'A-Za-z0-9_\n' '_'); [ "$(basename "$l" .dart)" = "$name" ] && p=$name; args="$args --lib package:$name/$l=$p"; done
mkdir -p $ROOT/out/modules
s=$(date +%s.%N)
(cd $ROOT/host && dart run tool/gen_module.dart --name $name $args) > $ROOT/out/modules/$name.log 2>&1
rc=$?
e=$(date +%s.%N)
python3 -I -c "print('$name rc=$rc wall=%.1fs' % ($e-$s))" | tee $ROOT/out/modules/$name.time
grep "public callable members\|Unhandled\|Error" $ROOT/out/modules/$name.log | head -3
