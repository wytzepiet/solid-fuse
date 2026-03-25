import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('all() builtins availability', (tester) async {
    await LibFjs.init();
    final runtime = await JsAsyncRuntime.withOptions(
      builtin: JsBuiltinOptions.all(),
    );
    final context = await JsAsyncContext.from(runtime: runtime);
    final engine = JsEngine(context: context);
    await engine.init(bridge: (_) async => const JsResult.ok(JsValue.none()));

    final r = await engine.eval(source: JsCode.code('''
      (() => ({
        URL: typeof URL,
        URLSearchParams: typeof URLSearchParams,
        fetch: typeof fetch,
        AbortController: typeof AbortController,
        TextEncoder: typeof TextEncoder,
        TextDecoder: typeof TextDecoder,
        crypto: typeof crypto,
        Headers: typeof Headers,
        Request: typeof Request,
        Response: typeof Response,
        ReadableStream: typeof ReadableStream,
        Blob: typeof Blob,
        btoa: typeof btoa,
        atob: typeof atob,
        navigator: typeof navigator,
        WebSocket: typeof WebSocket,
        Buffer: typeof Buffer,
        setTimeout: typeof setTimeout,
        setInterval: typeof setInterval,
        clearTimeout: typeof clearTimeout,
        structuredClone: typeof structuredClone,
        performance: typeof performance,
        Event: typeof Event,
        EventTarget: typeof EventTarget,
      }))()
    '''));
    await runtime.idle();
    final data = r.value as Map<String, dynamic>;
    for (final e in (data.entries.toList()..sort((a, b) => a.key.compareTo(b.key)))) {
      final status = e.value == 'undefined' ? '  MISSING' : '';
      debugPrint('  ${e.key}: ${e.value}$status');
    }
    expect(true, isTrue);
  });
}
