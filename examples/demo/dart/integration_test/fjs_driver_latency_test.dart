// Regression test for fjs's internal background driver: detached async work
// (setTimeout, fetch) must advance WITHOUT any external pump.
//
// History: solid-fuse once ran a forked fjs with a fixed-interval poll + an iOS
// thread-QoS bump, because the event-driven driver's wakes were unreliable on
// real iOS hardware (idle background threads get throttled). fjs 3.0 went
// event-driven with a 1s defensive fallback and absorbed our fixes, so we
// dropped the fork. This test guards that the driver stays prompt — especially
// on a physical iOS device, where throttling is real.
//
// Method: JS records Date.now() at schedule and at fire; Dart waits passively
// (no engine call during the window) then does ONE read. A small recorded
// latency means the driver woke autonomously. ~1000ms means it fell back to the
// defensive poll (the throttling regression). null means it never ran without a
// pump.
//
// Run (use a physical device for the meaningful throttling check):
//   flutter test integration_test/fjs_driver_latency_test.dart -d <device-id>

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:solid_fuse/fjs.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late JsEngine engine;

  setUpAll(() async {
    await initFjs();
    engine = await JsEngine.create(builtins: JsBuiltinOptions.all());
    await engine.initWithoutBridge();
  });

  tearDownAll(() async {
    await engine.close();
  });

  /// Schedule a detached setTimeout(targetMs), wait `waitMs` passively (no
  /// engine call), then read back the JS-measured fire latency. Returns null if
  /// it never fired during the passive wait.
  Future<num?> measureTimer({required int targetMs, required int waitMs}) async {
    final tag = 't$targetMs';
    await engine.eval(
      source: JsCode.code(
        'globalThis.__$tag = null;'
        'const __s$tag = Date.now();'
        'setTimeout(() => { globalThis.__$tag = Date.now() - __s$tag; }, $targetMs);'
        '"scheduled";',
      ),
    );
    // Passive wait — deliberately NOT touching the engine, so nothing here can
    // pump the timer. Only fjs's own driver can advance it.
    await Future<void>.delayed(Duration(milliseconds: waitMs));
    final fired = await engine.eval(source: JsCode.code('globalThis.__$tag'));
    return fired.value as num?;
  }

  test('detached setTimeout fires autonomously (no external pump)', () async {
    for (final target in [0, 50, 200]) {
      final latency = await measureTimer(targetMs: target, waitMs: target + 600);
      // ignore: avoid_print
      print('[fjs-latency] setTimeout($target ms) fired after: '
          '${latency ?? "NEVER (no autonomous pump)"} ms');
      expect(latency, isNotNull,
          reason: 'setTimeout($target) never fired during a passive wait — the '
              'driver is not advancing detached work autonomously.');
      // Generous ceiling: anything near 1000ms means it rode the 1s defensive
      // fallback rather than an event-driven wake.
      expect(latency!, lessThan(900),
          reason: 'setTimeout($target) took ${latency}ms — looks like the 1s '
              'defensive fallback, not a prompt event-driven wake (the iOS '
              'throttling regression our fork worked around).');
    }
  });

  test('detached fetch resolves autonomously (no external pump)', () async {
    await engine.eval(
      source: JsCode.code(
        'globalThis.__fetched = null;'
        'globalThis.__fetchErr = null;'
        'const __f0 = Date.now();'
        // gstatic generate_204: tiny, fast, globally reliable connectivity check.
        'fetch("https://www.gstatic.com/generate_204")'
        '  .then((r) => r.status)'
        '  .then((s) => { globalThis.__fetched = Date.now() - __f0; globalThis.__status = s; })'
        '  .catch((e) => { globalThis.__fetchErr = String(e); });'
        '"scheduled";',
      ),
    );
    // Passive wait for the network round-trip; no engine call meanwhile.
    await Future<void>.delayed(const Duration(seconds: 8));
    final fetched = await engine.eval(source: JsCode.code('globalThis.__fetched'));
    final status = await engine.eval(source: JsCode.code('globalThis.__status ?? null'));
    final err = await engine.eval(source: JsCode.code('globalThis.__fetchErr'));
    // ignore: avoid_print
    print('[fjs-latency] fetch resolved after: ${fetched.value ?? "NEVER"} ms '
        '(status=${status.value}, err=${err.value})');
    // Network can genuinely fail offline; only assert the driver ran the
    // continuation at all (either resolved or rejected), not the HTTP outcome.
    final ran = fetched.value != null || err.value != null;
    expect(ran, isTrue,
        reason: 'fetch neither resolved nor rejected during a 4s passive wait — '
            'its continuation was not driven without an external pump.');
  });
}
