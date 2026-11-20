#!/usr/bin/env bash
# usage: gen_widgets.sh <unit> <lib-file> [<extra-lib-file> ...]   (lib files relative to the package's lib/)
set -uo pipefail
ROOT=/home/claude/solid-fuse/experiments/interop/packages
export PATH=/opt/flutter/bin:$PATH
name=$1; shift
libs=""; for l in "$@"; do p=$(echo "${name}_$(basename "$l" .dart)" | tr -c 'A-Za-z0-9_\n' '_'); libs="$libs[\"package:$name/$l\",\"$p\"],"; done
ver=$(python3 -I -c "
import json,re,sys
pc=json.load(open('$ROOT/host/.dart_tool/package_config.json'))
r=[p['rootUri'] for p in pc['packages'] if p['name']=='$name'][0].replace('file://','')
print(re.search(r'^version:\s*(\S+)',open(r+'/pubspec.yaml').read(),re.M).group(1))")
job=$ROOT/out/widgets/$name.job.json
cat > $job <<JSON
{"appRoot":"$ROOT/host","outDart":"$ROOT/host/lib/_generated","outManifest":"$ROOT/manifests","docs":"first",
 "units":[{"name":"$name","version":"$ver","libs":[${libs%,}],"include":null}]}
JSON
s=$(date +%s.%N)
(cd $ROOT/gen && dart run bin/fuse_gen.dart --job $job) > $ROOT/out/widgets/$name.summary.json 2> $ROOT/out/widgets/$name.log
rc=$?
e=$(date +%s.%N)
python3 -I -c "print('$name rc=$rc wall=%.1fs' % ($e-$s))" | tee $ROOT/out/widgets/$name.time
grep "fuse gen\]" $ROOT/out/widgets/$name.log | tail -1
