import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// Dev-only micro-benchmark of the JS<->Dart bridge.
///
/// Measures, separately:
///   - Dart-initiated echo RTT  (Dart Stopwatch)      D→J→D    pure crossing
///   - applyOps only            (Dart Stopwatch)      no bridge — apply+markDirty
///   - Dart-initiated pipeline  (Dart Stopwatch)      D→J→(ops)→D  the real
///       signal-driven-animation path: deliver a tick, JS emits ops, Dart applies
///   - JS-initiated echo RTT    (JS performance.now)  J→D→J
///   - End-to-end op apply RTT  (JS performance.now)  J→D(applyOps)→J
///
/// One-way times are NOT measured directly: the JS clock (performance.now) and
/// the Dart clock (Stopwatch) have independent origins, so any one-way figure
/// requires assuming the two legs are symmetric and is then just ~RTT/2. The
/// honest, measurable signal is the two RTTs and how they differ by initiation
/// direction (sync engine.call vs async bridge callback / poll-resumed await).
Future<void> runBridgeBench(FuseRuntime runtime) async {
  final channels = runtime.channels;
  if (channels == null) {
    debugPrint('[bench] runtime has no channels — did start() run?');
    return;
  }

  const warmup = 50;
  const iters = 500;
  const opIters = 300;
  const benchIdBase = 900000;
  const benchCount = 256;
  const opSizes = [1, 16, 64, 256];

  try {
    // Handlers the JS side calls back into.
    channels.on('_benchEchoDart', (d) => d);
    channels.on('_benchApply', (d) {
      runtime.applyOps(d['ops'] as List);
      return true;
    });

    // Detached bench nodes: present in the registry but not in the widget tree,
    // so markDirty notifies no ListenableBuilder — we measure pure apply cost.
    runtime.applyOps([
      for (var i = 0; i < benchCount; i++)
        {'op': 'create', 'id': benchIdBase + i, 'type': 'view', 'props': <String, dynamic>{}},
    ]);

    Map<String, dynamic> statsOf(List<int> us) {
      final s = [...us]..sort();
      final n = s.length;
      double pct(double p) => s[(p * n).floor().clamp(0, n - 1)].toDouble();
      return {
        'mean': s.fold<int>(0, (a, b) => a + b) / n,
        'min': s.first.toDouble(),
        'p50': pct(0.5),
        'p95': pct(0.95),
        'p99': pct(0.99),
        'max': s.last.toDouble(),
      };
    }

    Map<String, dynamic> payload(int fields) =>
        {for (var i = 0; i < fields; i++) 'k$i': i};
    final payloads = <String, Map<String, dynamic>>{
      'empty': {},
      'tiny(1)': payload(1),
      'med(50)': payload(50),
      'large(200)': payload(200),
    };

    // (1) Dart-initiated echo RTT  D→J→D
    final dartEcho = <String, dynamic>{};
    for (final e in payloads.entries) {
      for (var i = 0; i < warmup; i++) {
        await channels.call('_benchEchoJs', e.value);
      }
      final samples = <int>[];
      final sw = Stopwatch();
      for (var i = 0; i < iters; i++) {
        sw.reset();
        sw.start();
        await channels.call('_benchEchoJs', e.value);
        sw.stop();
        samples.add(sw.elapsedMicroseconds);
      }
      dartEcho[e.key] = statsOf(samples);
    }

    // (2) applyOps only (no bridge): 1 prop on each of N detached nodes.
    final applyOnly = <String, dynamic>{};
    for (final size in opSizes) {
      List<Map<String, dynamic>> batch() => [
            for (var i = 0; i < size; i++)
              {
                'op': 'setProp',
                'id': benchIdBase + i,
                'name': 'opacity',
                'value': (i % 100) / 100.0,
              },
          ];
      for (var i = 0; i < warmup; i++) {
        runtime.applyOps(batch());
      }
      final samples = <int>[];
      final sw = Stopwatch();
      for (var i = 0; i < opIters; i++) {
        final b = batch();
        sw.reset();
        sw.start();
        runtime.applyOps(b);
        sw.stop();
        samples.add(sw.elapsedMicroseconds);
      }
      applyOnly['$size'] = statsOf(samples);
    }

    // (3) Dart-initiated pipeline  D→J→(ops)→D  — the signal-driven path.
    Completer<void>? pending;
    var pendingToken = -1;
    runtime.onOpsApplied = (ops) {
      if (pending == null) return;
      for (final op in ops) {
        if (op is Map &&
            op['name'] == '__sentinel__' &&
            (op['value'] as num?)?.toInt() == pendingToken) {
          final c = pending!;
          pending = null;
          c.complete();
          return;
        }
      }
    };

    Future<void> tick(int size, int token) {
      final c = Completer<void>();
      pending = c;
      pendingToken = token;
      unawaited(channels.send('_benchEmitOps',
          {'size': size, 'benchIdBase': benchIdBase, 'token': token}));
      return c.future;
    }

    final pipeline = <String, dynamic>{};
    for (final size in opSizes) {
      for (var i = 0; i < warmup; i++) {
        await tick(size, i);
      }
      final samples = <int>[];
      final sw = Stopwatch();
      for (var i = 0; i < opIters; i++) {
        sw.reset();
        sw.start();
        await tick(size, i);
        sw.stop();
        samples.add(sw.elapsedMicroseconds);
      }
      pipeline['$size'] = statsOf(samples);
    }
    runtime.onOpsApplied = null;

    // (4) Hand off to JS for the performance.now()-timed measurements. Fire it
    // fire-and-forget and await results over a separate channel: JS must run its
    // reverse-call loop OUTSIDE this Dart→JS dispatch (it does so via setTimeout),
    // because an awaited reverse call nested in a forward dispatch panics fjs.
    final jsCompleter = Completer<Map>();
    channels.on('_benchResults', (d) {
      if (!jsCompleter.isCompleted) jsCompleter.complete(d);
      return null;
    });
    unawaited(channels.send('_startJsBench', {
      'warmup': warmup,
      'iters': iters,
      'opIters': opIters,
      'benchIdBase': benchIdBase,
      'benchCount': benchCount,
      'opSizes': opSizes,
    }));
    final js = await jsCompleter.future.timeout(const Duration(minutes: 5));
    if (js['error'] != null) {
      debugPrint('[bench] JS side failed: ${js['error']}');
      return;
    }

    _printReport(
      dartEcho: dartEcho,
      applyOnly: applyOnly,
      pipeline: pipeline,
      jsEcho: js['jsEcho'] as Map,
      jsApply: js['jsApply'] as Map,
      perfRes: (js['perfRes'] as num).toDouble(),
    );
  } catch (e, st) {
    debugPrint('[bench] failed: $e\n$st');
  }
}

void _printReport({
  required Map dartEcho,
  required Map applyOnly,
  required Map pipeline,
  required Map jsEcho,
  required Map jsApply,
  required double perfRes,
}) {
  String n(Object? v) => (v as num).toStringAsFixed(1);
  String row(String label, Map s) =>
      '${label.padRight(12)}'
      '${n(s['mean']).padLeft(10)}'
      '${n(s['min']).padLeft(10)}'
      '${n(s['p50']).padLeft(10)}'
      '${n(s['p95']).padLeft(10)}'
      '${n(s['max']).padLeft(10)}';
  String header(String first) =>
      '${first.padRight(12)}${'mean'.padLeft(10)}${'min'.padLeft(10)}'
      '${'p50'.padLeft(10)}${'p95'.padLeft(10)}${'max'.padLeft(10)}   (µs)';

  void section(StringBuffer b, String title, String first, Map data) {
    b
      ..writeln('\n▸ $title')
      ..writeln(header(first));
    data.forEach((k, v) => b.writeln(row(k as String, v as Map)));
  }

  final b = StringBuffer()
    ..writeln('\n══════════════ solid-fuse bridge benchmark ══════════════');
  section(b, 'Dart-initiated echo RTT (D→J→D, Stopwatch)', 'payload', dartEcho);
  section(b, 'applyOps only — no bridge (apply + markDirty)', 'ops', applyOnly);
  section(b, 'Dart-initiated pipeline D→J→(ops)→D (signal path)', 'ops', pipeline);
  section(b, 'JS-initiated echo RTT (J→D→J, performance.now)', 'payload', jsEcho);
  section(b, 'End-to-end op apply RTT (J→D applyOps→J)', 'ops', jsApply);
  b
    ..writeln('\nperformance.now() resolution: ${perfRes}ms')
    ..writeln('frame budget: 16667µs @60fps · 8333µs @120fps')
    ..writeln('═════════════════════════════════════════════════════════\n');
  debugPrint(b.toString());
}
