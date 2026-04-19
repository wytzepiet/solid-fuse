// Verifies channels.send/call/on round-trip semantics in both directions:
// successful returns, sync and async error propagation, and nested-object
// shapes through FJS's JsValue.from serialization.

import 'dart:async';
import 'dart:convert';

import 'package:fjs/fjs.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:solid_fuse/src/channels.dart';
import 'package:solid_fuse/src/engine.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late JsAsyncRuntime runtime;
  late JsEngine engine;
  late FuseChannels channels;
  Timer? pumpTimer;

  setUpAll(() async {
    await LibFjs.init();
    runtime = await createRuntime();
    final r = await createEngine(runtime: runtime);
    engine = r.engine;
    channels = r.channels;

    // Install a JS-side dispatcher so Dart→JS channels.call has somewhere
    // to land. Production code installs this when solid-fuse's bundle
    // evaluates; the raw test engine doesn't load the bundle.
    await engine.eval(source: JsCode.code('''
      globalThis.__testHandlers = new Map();
      globalThis.__dispatch = async (ch, data) => {
        const h = globalThis.__testHandlers.get(ch);
        return h ? await h(data) : undefined;
      };
    '''));
    await drainImmediateJobs(runtime);

    // External job pump — required so rquickjs's microtask queue keeps
    // advancing while Dart-side Futures (channels.call) are pending.
    pumpTimer = Timer.periodic(const Duration(milliseconds: 10), (_) {
      runtime.executePendingJob().catchError((_) => false);
    });
  });

  tearDownAll(() async {
    pumpTimer?.cancel();
  });

  testWidgets('JS→Dart success: handler return value flows back',
      (tester) async {
    channels.on('doubler', (data) => {'doubled': (data['n'] as int) * 2});

    final r = await engine.eval(
      source: JsCode.code('fjs.bridge_call({ channel: "doubler", n: 21 })'),
      options: JsEvalOptions.withPromise(),
    );
    expect(r.value, equals({'doubled': 42}));
  });

  testWidgets('Dart→JS success: handler return value flows back',
      (tester) async {
    await engine.eval(source: JsCode.code(
        '__testHandlers.set("square", (data) => ({ squared: data.n * data.n }));'));
    await drainImmediateJobs(runtime);

    final r = await channels.call('square', {'n': 7});
    expect(r, equals({'squared': 49}));
  });

  testWidgets('JS→Dart error: sync throw propagates with message',
      (tester) async {
    channels.on('dartThrows', (_) {
      throw StateError('boom-from-dart');
    });

    try {
      await engine.eval(
        source: JsCode.code('fjs.bridge_call({ channel: "dartThrows" })'),
        options: JsEvalOptions.withPromise(),
      );
      fail('expected eval to reject');
    } catch (e) {
      expect(e.toString(), contains('boom-from-dart'));
    }
  });

  testWidgets('JS→Dart error: async throw propagates with message',
      (tester) async {
    channels.on('dartThrowsAsync', (_) async {
      await Future<void>.delayed(const Duration(milliseconds: 1));
      throw StateError('boom-async-dart');
    });

    try {
      await engine.eval(
        source: JsCode.code('fjs.bridge_call({ channel: "dartThrowsAsync" })'),
        options: JsEvalOptions.withPromise(),
      );
      fail('expected eval to reject');
    } catch (e) {
      expect(e.toString(), contains('boom-async-dart'));
    }
  });

  testWidgets('Dart→JS error: sync throw propagates with message',
      (tester) async {
    await engine.eval(source: JsCode.code('''
      __testHandlers.set("jsThrows", () => {
        throw new Error("kaboom-from-js");
      });
    '''));
    await drainImmediateJobs(runtime);

    try {
      await channels.call('jsThrows', {});
      fail('expected call to throw');
    } catch (e) {
      expect(e.toString(), contains('kaboom-from-js'));
    }
  });

  testWidgets('Dart→JS error: async throw propagates with message',
      (tester) async {
    await engine.eval(source: JsCode.code('''
      __testHandlers.set("jsThrowsAsync", async () => {
        await new Promise(r => setTimeout(r, 1));
        throw new Error("kaboom-async-js");
      });
    '''));
    await drainImmediateJobs(runtime);

    try {
      await channels.call('jsThrowsAsync', {});
      fail('expected call to throw');
    } catch (e) {
      expect(e.toString(), contains('kaboom-async-js'));
    }
  });

  testWidgets('JS→Dart nested-object round-trip', (tester) async {
    channels.on('echoDeep', (_) => {
          'list': [1, 2, 3],
          'nested': {
            'a': 1,
            'b': 'x',
            'deep': {'flag': true},
          },
          'nullable': null,
          'mixedList': [
            1,
            'two',
            {'three': 3}
          ],
        });

    final r = await engine.eval(
      source: JsCode.code(
          'fjs.bridge_call({ channel: "echoDeep" }).then(r => JSON.stringify(r))'),
      options: JsEvalOptions.withPromise(),
    );
    final decoded = jsonDecode(r.value as String);
    expect(decoded, {
      'list': [1, 2, 3],
      'nested': {
        'a': 1,
        'b': 'x',
        'deep': {'flag': true},
      },
      'nullable': null,
      'mixedList': [
        1,
        'two',
        {'three': 3}
      ],
    });
  });

  testWidgets('Dart→JS call times out with ChannelTimeoutError', (tester) async {
    await engine.eval(source: JsCode.code('''
      __testHandlers.set("jsSlow", async () => {
        await new Promise(r => setTimeout(r, 500));
        return "too-late";
      });
    '''));
    await drainImmediateJobs(runtime);

    try {
      await channels.call('jsSlow', {}, timeout: const Duration(milliseconds: 100));
      fail('expected call to time out');
    } catch (e) {
      expect(e, isA<ChannelTimeoutError>());
      expect(e.toString(), contains('jsSlow'));
      expect(e.toString(), contains('100ms'));
    }
  });

  testWidgets('Dart→JS call with timeout: null waits past the default',
      (tester) async {
    await engine.eval(source: JsCode.code('''
      __testHandlers.set("jsSlowish", async () => {
        await new Promise(r => setTimeout(r, 200));
        return "made-it";
      });
    '''));
    await drainImmediateJobs(runtime);

    final r = await channels.call('jsSlowish', {}, timeout: null);
    expect(r, equals('made-it'));
  });

  testWidgets('Dart→JS nested-object round-trip', (tester) async {
    await engine.eval(source: JsCode.code('''
      __testHandlers.set("makeDeep", () => ({
        list: [10, 20, 30],
        nested: { a: "alpha", deep: { n: 99 } },
        flags: [true, false, true],
        nullable: null,
      }));
    '''));
    await drainImmediateJobs(runtime);

    final r = await channels.call('makeDeep', {});
    expect(r, {
      'list': [10, 20, 30],
      'nested': {
        'a': 'alpha',
        'deep': {'n': 99}
      },
      'flags': [true, false, true],
      'nullable': null,
    });
  });
}
