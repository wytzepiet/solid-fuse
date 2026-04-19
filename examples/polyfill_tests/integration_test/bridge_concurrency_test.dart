// Regression probe for the concurrency assumption the channels design rests
// on: a short engine.call must not serialize behind an in-flight long one.

import 'dart:async';

import 'package:fjs/fjs.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('engine.call concurrency: short doesn\'t wait for long',
      (tester) async {
    await LibFjs.init();
    final runtime = await JsAsyncRuntime.withOptions(
      builtin: JsBuiltinOptions.all(),
    );
    final context = await JsAsyncContext.from(runtime: runtime);
    final engine = JsEngine(context: context);

    await engine.init(
      bridge: (v) async {
        final data = v.value;
        if (data is Map && data['op'] == 'slow') {
          await Future<void>.delayed(const Duration(milliseconds: 500));
          return const JsResult.ok(JsValue.string('slow-done'));
        }
        return const JsResult.ok(JsValue.none());
      },
    );

    await engine.declareNewModule(
      module: JsModule.code(
        module: 'probe',
        code: '''
          export async function longHandler() {
            const r = await fjs.bridge_call({ op: "slow" });
            return "long:" + r;
          }
          export async function shortHandler() {
            return "short-done";
          }
        ''',
      ),
    );

    final pump = Timer.periodic(const Duration(milliseconds: 10), (_) {
      runtime.executePendingJob().catchError((_) => false);
    });

    final sw = Stopwatch()..start();
    final longFuture = engine.call(
      module: 'probe',
      method: 'longHandler',
      params: [],
    );
    await Future<void>.delayed(const Duration(milliseconds: 50));

    final shortStart = sw.elapsedMilliseconds;
    await engine.call(
      module: 'probe',
      method: 'shortHandler',
      params: [],
    );
    final shortElapsed = sw.elapsedMilliseconds - shortStart;
    await longFuture;
    pump.cancel();

    expect(shortElapsed, lessThan(200),
        reason: 'engine.call should be concurrent, not serialized');
  });
}
