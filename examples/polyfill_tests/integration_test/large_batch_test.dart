// Large op batches across the bridge.
//
// fjs 3.3.0 bounds JS→Dart value conversion (MAX_CONVERSION_NODES = 100,000
// values, depth 128). The renderer used to send each flush as an array of op
// objects, which crossed that bound at ~4,500 mounted elements; it now sends
// one JSON string instead (renderer.ts flushOps). This probe documents where
// the bound sits for op-shaped arrays, for anyone tempted to switch back.

import 'package:solid_fuse/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:solid_fuse/src/engine.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('op-shaped batches: where the conversion bound sits',
      (tester) async {
    await initFjs();
    final r = await createEngine();
    final engine = r.engine;
    var received = 0;
    r.channels.on('_probe', (data) {
      received = (data['ops'] as List).length;
      return null;
    });

    Future<String> sendBatch(int elements) async {
      // Per element: what a mount emits for a node with two props.
      final res = await engine.eval(
        source: JsCode.code('''
          (async () => {
            const ops = [];
            for (let i = 0; i < $elements; i++) {
              ops.push({ op: "create", id: i, type: "view", props: {} });
              ops.push({ op: "setProp", id: i, name: "padding", value: 8 });
              ops.push({ op: "setProp", id: i, name: "color", value: "#fff" });
              ops.push({ op: "insert", parent: 0, id: i, before: null });
            }
            try {
              await fjs.bridge_call({ channel: "_probe", ops });
              return "ok";
            } catch (e) {
              return "error: " + String(e && e.message || e);
            }
          })()
        '''),
        options: JsEvalOptions.withPromise(),
      );
      return res.value as String;
    }

    final results = <int, String>{};
    for (final n in [1000, 3000, 4000, 5000, 6000, 10000]) {
      received = 0;
      String outcome;
      try {
        outcome = await sendBatch(n);
      } on JsError catch (e) {
        outcome = 'JsError: $e';
      }
      results[n] = '$outcome (received ${received ~/ 4} elements)';
      debugPrint('[large_batch] $n elements -> ${results[n]}');
    }

    // 1,000-element mounts must keep working.
    expect(results[1000], startsWith('ok'));
    await retireEngine(r.engine, r.wsManager, r.brightnessObserver);
  });
}
