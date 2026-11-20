#!/usr/bin/env bash
# Regenerates everything and runs all three proofs. ~2 minutes.
set -euo pipefail
cd "$(dirname "$0")"
export PATH=/opt/flutter/bin:$PATH
q() { grep -v "superuser\|as root\|^  /\|📎\|^$" || true; }

flutter pub get 2>&1 | tail -1
echo "== Part 1: survey";            dart run tool/survey.dart 2>&1 | q
echo "== Part 2: generate (Flutter)"; dart run tool/generate.dart 2>&1 | q
echo "== Part 2: generate, derived codecs only"; dart run tool/generate.dart --no-overrides 2>&1 | q
echo "== Part 3: fl_chart";           dart run tool/generate.dart --name fl_chart --lib package:fl_chart/fl_chart.dart=fl_chart --all-from package:fl_chart/fl_chart.dart 2>&1 | q
echo "== Part 3: percent_indicator";  dart run tool/generate.dart --name percent_indicator --lib package:percent_indicator/percent_indicator.dart=percent_indicator --all-from package:percent_indicator/percent_indicator.dart 2>&1 | q
dart run tool/survey.dart --lib package:fl_chart/fl_chart.dart=fl_chart --lib package:percent_indicator/percent_indicator.dart=percent_indicator --only-extra --out out/survey_pub 2>&1 | q
echo "== flutter analyze";            flutter analyze 2>&1 | q
echo "== tsc";                        (cd ts && tsc -p . && echo "tsc: no errors")
echo "== flutter test";               flutter test 2>&1 | tail -1
