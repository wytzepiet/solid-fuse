import 'dart:async';
import 'dart:io';

import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:solid_fuse/src/engine.dart' show createTestEngine;

/// Local WebSocket echo server for testing.
class _TestWsServer {
  late HttpServer _server;
  late int port;

  Future<void> start() async {
    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    port = _server.port;
    _server.transform(WebSocketTransformer()).listen((ws) {
      ws.listen(
        (data) {
          if (data == '__close__') {
            ws.close(1000, 'server closing');
          } else {
            ws.add(data); // echo
          }
        },
        onDone: () {},
      );
    });
  }

  Future<void> stop() async {
    await _server.close(force: true);
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late _TestWsServer server;
  late JsAsyncRuntime runtime;
  late JsEngine engine;

  setUpAll(() async {
    server = _TestWsServer();
    await server.start();
    debugPrint('Test WS server on port ${server.port}');

    await LibFjs.init();
    runtime = await JsAsyncRuntime.withOptions(
      builtin: JsBuiltinOptions.all(),
    );
    engine = await createTestEngine(runtime: runtime);

    final polyfillsJs = await rootBundle.loadString('assets/polyfills.js');
    await engine.eval(source: JsCode.code(polyfillsJs));
    await runtime.idle();
  });

  tearDownAll(() async {
    await server.stop();
  });

  /// Run JS that sets globalThis.__wsTestResult when done, poll for it.
  Future<Map<String, dynamic>> runWsTest(
    String jsBody, {
    Duration timeout = const Duration(seconds: 5),
  }) async {
    // Wrap in IIFE to avoid redeclaration errors across tests.
    await engine.eval(source: JsCode.code('''
      globalThis.__wsTestResult = undefined;
      (() => { $jsBody })();
    '''));
    await runtime.idle();

    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      await Future.delayed(const Duration(milliseconds: 50));
      final r = await engine.eval(
        source: JsCode.code(
          'typeof __wsTestResult !== "undefined" && __wsTestResult !== undefined ? __wsTestResult : null',
        ),
      );
      await runtime.idle();
      if (r.value != null) {
        return r.value as Map<String, dynamic>;
      }
    }
    throw TimeoutException('WebSocket test timed out');
  }

  testWidgets('constructor and constants', (tester) async {
    final r = await engine.eval(source: JsCode.code('''
      ({
        type: typeof WebSocket,
        CONNECTING: WebSocket.CONNECTING,
        OPEN: WebSocket.OPEN,
        CLOSING: WebSocket.CLOSING,
        CLOSED: WebSocket.CLOSED,
      })
    '''));
    await runtime.idle();
    final data = r.value as Map<String, dynamic>;
    expect(data['type'], 'function');
    expect(data['CONNECTING'], 0);
    expect(data['OPEN'], 1);
    expect(data['CLOSING'], 2);
    expect(data['CLOSED'], 3);
  });

  testWidgets('open event fires', (tester) async {
    final result = await runWsTest('''
      const ws = new WebSocket("ws://127.0.0.1:${server.port}");
      ws.onopen = () => {
        globalThis.__wsTestResult = { opened: true, readyState: ws.readyState };
      };
    ''');
    expect(result['opened'], true);
    expect(result['readyState'], 1);
  });

  testWidgets('echo (send and receive)', (tester) async {
    final result = await runWsTest('''
      const ws = new WebSocket("ws://127.0.0.1:${server.port}");
      ws.onopen = () => ws.send("hello fuse");
      ws.onmessage = (ev) => {
        globalThis.__wsTestResult = { echoed: ev.data };
        ws.close();
      };
    ''');
    expect(result['echoed'], 'hello fuse');
  });

  testWidgets('multiple messages in order', (tester) async {
    final result = await runWsTest('''
      const messages = [];
      const ws = new WebSocket("ws://127.0.0.1:${server.port}");
      ws.onopen = () => { ws.send("one"); ws.send("two"); ws.send("three"); };
      ws.onmessage = (ev) => {
        messages.push(ev.data);
        if (messages.length === 3) {
          globalThis.__wsTestResult = { messages };
          ws.close();
        }
      };
    ''');
    final messages = (result['messages'] as List).cast<String>();
    expect(messages, ['one', 'two', 'three']);
  });

  testWidgets('client-initiated close', (tester) async {
    final result = await runWsTest('''
      const ws = new WebSocket("ws://127.0.0.1:${server.port}");
      ws.onopen = () => ws.close(1000, "done");
      ws.onclose = (ev) => {
        globalThis.__wsTestResult = {
          code: ev.code,
          readyState: ws.readyState,
        };
      };
    ''');
    expect(result['code'], 1000);
    expect(result['readyState'], 3);
  });

  testWidgets('server-initiated close', (tester) async {
    final result = await runWsTest('''
      const ws = new WebSocket("ws://127.0.0.1:${server.port}");
      ws.onopen = () => ws.send("__close__");
      ws.onclose = (ev) => {
        globalThis.__wsTestResult = {
          code: ev.code,
          readyState: ws.readyState,
        };
      };
    ''');
    expect(result['code'], 1000);
    expect(result['readyState'], 3);
  });

  testWidgets('error on invalid port', (tester) async {
    final result = await runWsTest('''
      const ws = new WebSocket("ws://127.0.0.1:1");
      ws.onerror = () => { globalThis.__wsTestResult = { error: true }; };
      ws.onclose = () => {
        if (!globalThis.__wsTestResult) {
          globalThis.__wsTestResult = { closedAfterError: true };
        }
      };
    ''');
    expect(
      result['error'] == true || result['closedAfterError'] == true,
      true,
    );
  });

  testWidgets('send before open throws', (tester) async {
    final r = await engine.eval(source: JsCode.code('''
      (() => {
        const ws = new WebSocket("ws://127.0.0.1:${server.port}");
        try { ws.send("too early"); return { threw: false }; }
        catch(e) { return { threw: true }; }
      })()
    '''));
    await runtime.idle();
    final data = r.value as Map<String, dynamic>;
    expect(data['threw'], true);
  });
}
