#!/usr/bin/env bash
# Builds each lib/main_*.dart to a release AOT snapshot for android-arm64 with
# `flutter assemble` (needs only the engine artifacts, no Android SDK) and
# prints libapp.so sizes. Usage: tool/build_sizes.sh [variant ...]
set -euo pipefail
cd "$(dirname "$0")/.."
variants=("$@"); [ ${#variants[@]} -eq 0 ] && variants=(baseline fuse_like common60 widgets widgets_material all)
printf '%-18s %12s %12s\n' variant app.so_bytes gzip_bytes
for v in "${variants[@]}"; do
  out="build/size/$v"; rm -rf "$out" .dart_tool/flutter_build; mkdir -p "$out"
  flutter assemble --no-version-check -dTargetPlatform=android-arm64 -dBuildMode=release \
    -dTargetFile="lib/main_$v.dart" -dTreeShakeIcons=false \
    --output="$out" aot_elf_release >"$out/log.txt" 2>&1 || { echo "$v FAILED"; tail -5 "$out/log.txt"; continue; }
  so="$out/app.so"; cp "$(find .dart_tool/flutter_build -name app.so | head -1)" "$so"
  printf '%-18s %12s %12s\n' "$v" "$(stat -c %s "$so")" "$(gzip -9 -c "$so" | wc -c)"
done
