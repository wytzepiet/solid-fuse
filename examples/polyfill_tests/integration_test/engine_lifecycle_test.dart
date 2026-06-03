// Engine lifecycle: createEngine() starts a background driver; retireEngine()
// stops it, disposes the WebSocket manager, and close()s the runtime. Closing
// is only safe because fjs fixed the drop-without-close crash (#8) — before
// that, freeing a runtime with a live bridge aborted in JS_FreeRuntime. The
// test also spins up a fresh engine after retiring, proving the runtime freed
// cleanly and a new one runs (no stranded state, no leak of the old runtime).

import 'package:solid_fuse/fjs.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:solid_fuse/src/engine.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    await initFjs();
  });

  testWidgets('retireEngine closes the runtime; a fresh engine still runs',
      (tester) async {
    final first = await createEngine();

    // Async work resolves on the first engine's driver.
    final r1 = await first.engine.eval(
      source: JsCode.code('new Promise(r => setTimeout(() => r(7 * 6), 10))'),
      options: JsEvalOptions.withPromise(),
    );
    expect(r1.value, equals(42));

    // Stop driver, dispose sockets, close() the runtime. Pre-#8-fix this
    // aborted in JS_FreeRuntime; it must return cleanly now.
    await retireEngine(
        first.engine, first.wsManager, first.brightnessObserver);

    // A fresh engine after retiring still works — the runtime freed cleanly.
    final second = await createEngine();
    final r2 = await second.engine.eval(
      source: JsCode.code('new Promise(r => setTimeout(() => r("ok"), 10))'),
      options: JsEvalOptions.withPromise(),
    );
    expect(r2.value, equals('ok'));

    await retireEngine(
        second.engine, second.wsManager, second.brightnessObserver);
  });
}
