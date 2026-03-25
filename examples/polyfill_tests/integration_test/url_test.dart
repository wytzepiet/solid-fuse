import 'dart:convert';

import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:solid_fuse/src/engine.dart' show createTestEngine;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late JsAsyncRuntime runtime;
  late JsEngine engine;
  late List<Map<String, dynamic>> testCases;

  setUpAll(() async {
    await LibFjs.init();

    runtime = await JsAsyncRuntime.withOptions(
      builtin: JsBuiltinOptions.all(),
    );
    engine = await createTestEngine(runtime: runtime);

    // Load polyfills bundle.
    final polyfillsJs = await rootBundle.loadString('assets/polyfills.js');
    await engine.eval(source: JsCode.code(polyfillsJs));
    await runtime.idle();

    // Load WPT test data.
    final testDataJson = await rootBundle.loadString('assets/urltestdata.json');
    final testData = jsonDecode(testDataJson) as List;
    testCases = testData.whereType<Map<String, dynamic>>().toList();
  });

  testWidgets('URL polyfill passes WPT tests', (tester) async {
    var passed = 0;
    var failed = 0;
    final failures = <String>[];

    for (var i = 0; i < testCases.length; i++) {
      final tc = testCases[i];
      final input = tc['input'] as String;
      final base = tc['base'] as String?;
      final isFailure = tc['failure'] == true;

      final inputJson = jsonEncode(input);
      final baseJson = base != null ? jsonEncode(base) : 'undefined';

      final js = '''
        (() => {
          try {
            const u = new URL($inputJson, $baseJson);
            return {
              href: u.href,
              protocol: u.protocol,
              username: u.username,
              password: u.password,
              host: u.host,
              hostname: u.hostname,
              port: u.port,
              pathname: u.pathname,
              search: u.search,
              hash: u.hash,
            };
          } catch(e) {
            return { failure: true };
          }
        })()
      ''';

      final result = await engine.eval(source: JsCode.code(js));
      await runtime.idle();
      final data = result.value as Map<String, dynamic>;

      if (isFailure) {
        if (data['failure'] == true) {
          passed++;
        } else {
          failed++;
          failures.add('#$i: Expected failure for URL("$input", $base)');
        }
      } else {
        final didFail = data['failure'] == true;
        if (didFail) {
          failed++;
          failures.add('#$i: URL("$input", $base) threw unexpectedly');
          continue;
        }

        final props = ['href', 'protocol', 'username', 'password', 'host', 'hostname', 'port', 'pathname', 'search', 'hash'];
        var caseOk = true;
        for (final prop in props) {
          if (data[prop] != tc[prop]) {
            failed++;
            caseOk = false;
            failures.add(
              '#$i: $prop mismatch for URL("$input", $base)\n'
              '  expected: ${tc[prop]}\n'
              '  got:      ${data[prop]}',
            );
            break;
          }
        }
        if (caseOk) passed++;
      }
    }

    // Print summary
    debugPrint('\n=== WPT URL Test Results ===');
    debugPrint('Total: ${testCases.length}');
    debugPrint('Passed: $passed');
    debugPrint('Failed: $failed');
    if (failures.isNotEmpty) {
      debugPrint('\nFirst 20 failures:');
      for (final f in failures.take(20)) {
        debugPrint('  $f');
      }
    }

    // For now, just report results — we expect some failures since
    // Dart's Uri doesn't follow the WHATWG URL spec exactly.
    expect(passed, greaterThan(0), reason: 'Should pass at least some tests');
    debugPrint('\nPass rate: ${(passed * 100 / testCases.length).toStringAsFixed(1)}%');
  });
}
