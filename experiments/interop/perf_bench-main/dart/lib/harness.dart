// Driver plumbing of the render benchmark.
import 'dart:async';
import 'dart:convert';
import 'dart:developer' show Timeline;
import 'dart:io';
import 'dart:ui' show FramePhase, FrameTiming;

import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:solid_fuse/solid_fuse.dart';

import 'suite.dart' show phases;

late FuseRuntime rt;
late FuseChannels ch;

const buildMode = kReleaseMode ? 'release' : (kProfileMode ? 'profile' : 'debug');
final env = Platform.environment;
int envInt(String k, int d) => int.tryParse(env[k] ?? '') ?? d;

String loadavg() {
  try {
    return File('/proc/loadavg').readAsStringSync().split(' ').first;
  } catch (_) {
    return '?';
  }
}

int now() => Timeline.now; // microseconds, monotonic; same clock as FrameTiming
double ms(num micros) => (micros / 10).round() / 100;

void emit(String suite, String name, Map<String, dynamic> data) {
  // ignore: avoid_print
  print('BENCH ${jsonEncode({'suite': suite, 'name': name, 'mode': buildMode, 'load': loadavg(), ...data})}');
}

Future<Map<String, dynamic>> cmd(String c, [Map<String, dynamic> a = const {}]) async {
  final r = await ch.call('bench', {'cmd': c, ...a});
  final m = r is Map ? Map<String, dynamic>.from(r) : <String, dynamic>{'value': r};
  if (m['error'] != null) {
    // ignore: avoid_print
    print('BENCH_ERROR $c $a: ${m['error']}');
  }
  return m;
}

Future<void> settle([int millis = 60]) async {
  await Future<void>.delayed(Duration(milliseconds: millis));
  await SchedulerBinding.instance.endOfFrame;
}

// ---- frame timings ------------------------------------------------------------

final frameTimings = <FrameTiming>[];

Map<String, dynamic> frameStats(int from, int to) {
  final fs = frameTimings
      .where((f) =>
          f.timestampInMicroseconds(FramePhase.buildStart) >= from &&
          f.timestampInMicroseconds(FramePhase.buildStart) <= to)
      .toList()
    ..sort((a, b) => a
        .timestampInMicroseconds(FramePhase.vsyncStart)
        .compareTo(b.timestampInMicroseconds(FramePhase.vsyncStart)));
  if (fs.isEmpty) return {'frames': 0};
  final build = fs.map((f) => f.buildDuration.inMicroseconds).toList()..sort();
  final raster = fs.map((f) => f.rasterDuration.inMicroseconds).toList()..sort();
  var missed = 0, maxGap = 0, lateBuild = 0, lateTotal = 0;
  for (var i = 0; i < fs.length; i++) {
    if (fs[i].buildDuration.inMicroseconds > 16667) lateBuild++;
    if (fs[i].totalSpan.inMicroseconds > 16667) lateTotal++;
    if (i == 0) continue;
    final gap = fs[i].timestampInMicroseconds(FramePhase.vsyncStart) -
        fs[i - 1].timestampInMicroseconds(FramePhase.vsyncStart);
    if (gap > maxGap) maxGap = gap;
    if (gap > 25000) missed += (gap / 16667).round() - 1;
  }
  return {
    'frames': fs.length,
    'missedVsyncs': missed,
    'maxFrameGapMs': ms(maxGap),
    'buildP50Ms': ms(build[build.length ~/ 2]),
    'buildMaxMs': ms(build.last),
    'rasterP50Ms': ms(raster[raster.length ~/ 2]),
    'rasterMaxMs': ms(raster.last),
    'buildOver16': lateBuild,
    'spanOver16': lateTotal,
  };
}

/// FrameTiming batches are delivered up to a second late in release builds.
Future<void> flushTimings() => Future<void>.delayed(const Duration(milliseconds: 1300));

// ---- one timed JS operation, followed to the frame ------------------------------

int _lastBeat = 0;

class Run {
  int ops = 0, batches = 0, applyUs = 0, maxStall = 0, preRecvStall = 0;
  int? recv, applyEnd, frameStart, frameEnd;
  Map<String, dynamic>? phases;
  final done = Completer<void>();
}

Run? _current;

void installHooks() {
  SchedulerBinding.instance.addTimingsCallback(frameTimings.addAll);
  FusePerf.onOps = (n, recv, apply) {
    final m = _current;
    if (m == null) return;
    m.ops += n;
    m.batches++;
    m.applyUs += apply;
    m.applyEnd = recv + apply;
    if (m.recv == null) {
      m.recv = recv;
      // How long this event-loop turn had already run before applyOps started:
      // receiving and decoding the op batch on the UI isolate.
      m.preRecvStall = recv - _lastBeat;
      SchedulerBinding.instance.scheduleFrameCallback((_) => m.frameStart = now());
      SchedulerBinding.instance.addPostFrameCallback((_) {
        m.frameEnd = now();
        m.phases = phases();
        if (!m.done.isCompleted) m.done.complete();
      });
    }
  };
}

class Pending {
  Pending(this.suite, this.name, this.data, this.from, this.to);
  final String suite, name;
  final Map<String, dynamic> data;
  final int from, to;
}

final pending = <Pending>[];

/// Emit everything collected so far, with raster/build figures joined from FrameTiming.
Future<void> flushPending() async {
  await flushTimings();
  for (final p in pending) {
    emit(p.suite, p.name, {...p.data, 'ft': frameStats(p.from, p.to)});
  }
  pending.clear();
}

/// Runs a JS command that reports {jsMs, ops, ...} and follows its ops to the
/// end of the Flutter frame that shows them.
Future<Map<String, dynamic>> measure(
  String suite,
  String name,
  String c, [
  Map<String, dynamic> a = const {},
  Map<String, dynamic> extra = const {},
]) async {
  final m = Run();
  _current = m;
  // 1 ms heartbeat: the longest gap is the longest the UI isolate was blocked.
  _lastBeat = now();
  FusePerf.decodeUs = 0;
  FusePerf.bridgeValueUs = 0;
  final beat = Timer.periodic(const Duration(milliseconds: 1), (_) {
    final n = now();
    if (n - _lastBeat > m.maxStall) m.maxStall = n - _lastBeat;
    _lastBeat = n;
  });
  final t0 = now();
  final r = await cmd(c, a);
  final t1 = now();
  final nOps = (r['batches'] as num?)?.toInt() ?? 0;
  if (nOps > 0) {
    try {
      await m.done.future.timeout(Duration(milliseconds: envInt('FRAME_TIMEOUT_MS', 3000)));
    } on TimeoutException {
      // ignore: avoid_print
      print('BENCH_ERROR $name: frame never arrived (ops seen ${m.ops}, batches $nOps)');
    }
  }
  await Future<void>.delayed(const Duration(milliseconds: 2));
  beat.cancel();
  _current = null;
  final data = <String, dynamic>{
    ...extra,
    ...r,
    'load': loadavg(),
    'callMs': ms(t1 - t0),
    'uiMaxStallMs': ms(m.maxStall),
    if (m.recv != null) ...{
      'dartOps': m.ops,
      'toRecvMs': ms(m.recv! - t0),
      'applyMs': ms(m.applyUs),
      'decodeMs': ms(m.preRecvStall),
      'jsonDecodeMs': ms(FusePerf.decodeUs),
      'bridgeValueMs': ms(FusePerf.bridgeValueUs),
      if (m.frameStart != null) 'vsyncWaitMs': ms(m.frameStart! - m.applyEnd!),
      if (m.frameStart != null && m.frameEnd != null) 'uiFrameMs': ms(m.frameEnd! - m.frameStart!),
      if (m.frameEnd != null) 'e2eMs': ms(m.frameEnd! - t0),
      ...?m.phases,
    },
  };
  pending.add(Pending(suite, name, data, m.applyEnd ?? t0, (m.frameEnd ?? t1) + 2000));
  return data;
}

// ---- small stats --------------------------------------------------------------------

Map<String, dynamic> dist(List<num> xs, {String unit = 'Ms', double scale = 0.001}) {
  if (xs.isEmpty) return {'n': 0};
  final s = [...xs]..sort();
  double q(double p) => (s[((s.length - 1) * p).round()] * scale * 100).round() / 100;
  return {'n': s.length, 'p50$unit': q(0.5), 'p95$unit': q(0.95), 'max$unit': q(1), 'min$unit': q(0)};
}
