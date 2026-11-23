import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

/// What the frame clock cost, for measuring.
class FuseFrameStats {
  /// Frames JS was ticked in.
  int ticks = 0;

  /// Time the UI thread spent in ticks (JS and applying its ops), in
  /// microseconds, over all ticks.
  int micros = 0;

  /// Longest single tick.
  int maxMicros = 0;

  void reset() => ticks = micros = maxMicros = 0;

  @override
  String toString() => 'ticks $ticks, mean ${ticks == 0 ? 0 : micros ~/ ticks}us, max ${maxMicros}us';
}

/// Drives `requestAnimationFrame` (src/frames.ts) from Flutter's vsync.
///
/// Idle until JS queues a callback ([start], on `_frames`). Then, at the start of
/// each frame (a frame callback, before build), it calls JS synchronously
/// with the frame's time: the callbacks run, Solid flushes, and the reply
/// brings the ops, which this frame draws. The frame waits for JS. When JS
/// has no callbacks left, the clock stops: nothing runs while nothing moves.
class FuseFrameClock {
  FuseFrameClock({required this.callSync, required this.applySyncOps});

  /// Calls JS synchronously; returns `{result, ops}`.
  final Object? Function(String channel, Map<String, dynamic> data) callSync;

  /// Applies the ops a synchronous reply carries (see `syncOps` in renderer.ts).
  final void Function(Object? ops) applySyncOps;

  final stats = FuseFrameStats();

  bool _running = false;

  /// JS queued a callback: tick from the next frame on.
  void start() {
    if (_running) return;
    _running = true;
    SchedulerBinding.instance.scheduleFrameCallback(_tick);
  }

  void _tick(Duration frame) {
    final watch = Stopwatch()..start();
    Object? result;
    try {
      final reply = callSync('_frame', {'t': frame.inMicroseconds / 1000.0});
      if (reply is Map) {
        applySyncOps(reply['ops']);
        result = reply['result'];
      }
    } catch (e) {
      // Engine retired (hot restart): stop. JS starts the clock again.
      debugPrint('[Fuse] frame tick failed: $e');
    }
    final us = watch.elapsedMicroseconds;
    stats
      ..ticks += 1
      ..micros += us;
    if (us > stats.maxMicros) stats.maxMicros = us;
    if (kDebugMode) _warnIfSlow(us);

    if (result is Map && result['more'] == true) {
      // Registered during this frame's callbacks: runs in the next frame.
      SchedulerBinding.instance.scheduleFrameCallback(_tick);
    } else {
      _running = false;
    }
  }

  // A tick holds the whole frame: say so when it takes a third of it.
  DateTime? _warned;
  void _warnIfSlow(int us) {
    final views = WidgetsBinding.instance.platformDispatcher.views;
    final rate = views.isEmpty ? 0.0 : views.first.display.refreshRate;
    final budget = 1e6 / (rate > 0 ? rate : 60);
    if (us < budget / 3) return;
    final now = DateTime.now();
    if (_warned != null && now.difference(_warned!) < const Duration(seconds: 5)) return;
    _warned = now;
    debugPrint(
      '[Fuse] requestAnimationFrame callbacks took ${(us / 1000).toStringAsFixed(1)} ms '
      'of a ${(budget / 1000).toStringAsFixed(1)} ms frame. The frame waits for them; '
      'move heavy work out of frame callbacks.',
    );
  }
}
