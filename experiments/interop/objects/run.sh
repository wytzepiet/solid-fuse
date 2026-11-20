#!/usr/bin/env bash
# Regenerates everything and runs every proof. About 5 minutes on 4 busy cores
# (each `dart run` resolves the Flutter element model, 15 to 40 s).
set -euo pipefail
cd "$(dirname "$0")"
export PATH=/opt/flutter/bin:$PATH
q() { grep -v "superuser\|as root\|^  /\|📎\|^$" || true; }
mod() { dart run tool/gen_module.dart "$@" 2>&1 | q; }

flutter pub get 2>&1 | tail -1
(cd ts && [ -d node_modules ] || bun install 2>&1 | tail -1)

echo "== Part 1: survey";               dart run tool/survey_objects.dart 2>&1 | q
echo "== Part 3: objects (fuse.objects.json)"; dart run tool/gen_objects.dart 2>&1 | q
echo "== Part 4: plugin modules"
mod --name url_launcher --lib package:url_launcher/url_launcher.dart=url_launcher --lib package:url_launcher/url_launcher_string.dart=url_launcher_string
mod --name shared_preferences --lib package:shared_preferences/shared_preferences.dart=shared_preferences
mod --name path_provider --lib package:path_provider/path_provider.dart=path_provider
mod --name share_plus --lib package:share_plus/share_plus.dart=share_plus
mod --name geolocator --lib package:geolocator/geolocator.dart=geolocator
mod --name mobile_scanner --lib package:mobile_scanner/mobile_scanner.dart=mobile_scanner

echo "== flutter analyze (generated Dart + support + tools + tests)"; flutter analyze 2>&1 | q
echo "== tsc --strict (generated TS + runtime + samples, against the real solid-fuse source)"
(cd ts && tsc -p . && echo "tsc: no errors")
echo "== bun test (JS half executed against the real handle.ts / renderer.ts / channels.ts)"
(cd ts && bun test --conditions browser --tsconfig-override ./tsconfig.json 2>&1 | tail -5)
echo "== flutter test (generated handles and modules against the real controllers / plugins)"
flutter test 2>&1 | tail -1
