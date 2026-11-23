import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'channels.dart';

/// How the frame clock ticks JS (`requestAnimationFrame`, src/frames.ts).
enum FuseFrameMode {
  /// After frame N, send JS the tick for frame N+1 with the time that frame
  /// will have. JS works while Dart carries on between frames. If the tick is
  /// still running at vsync N+1, the frame waits for it. Either way frame
  /// N+1 draws what JS computed for it.
  ahead,

  /// At the start of frame N, call JS synchronously and draw the ops it
  /// produced in frame N. Dart waits for all of it.
  sync,
}

/// Counts of what the frame clock did, for measuring.
class FuseFrameStats {
  /// Ticks sent.
  int ticks = 0;

  /// Ticks a frame had to wait for ([FuseFrameMode.ahead]); in
  /// [FuseFrameMode.sync] every tick waits.
  int held = 0;

  /// Time the UI thread waited on JS and applied what it brought, in
  /// microseconds, over all ticks.
  int blockedMicros = 0;

  /// Largest wait of a single frame.
  int maxBlockedMicros = 0;

  /// Time from sending an [FuseFrameMode.ahead] tick to its reply, over all
  /// ticks that were not held.
  int replyMicros = 0;

  void _blocked(int us) {
    held++;
    blockedMicros += us;
    if (us > maxBlockedMicros) maxBlockedMicros = us;
  }

  void reset() => ticks = held = blockedMicros = maxBlockedMicros = replyMicros = 0;

  @override
  String toString() =>
      'ticks $ticks, held $held, blocked ${blockedMicros}us (max $maxBlockedMicros), '
      'reply mean ${ticks - held == 0 ? 0 : replyMicros ~/ (ticks - held)}us';
}

/// Drives `requestAnimationFrame` from Flutter's vsync. Idle until JS queues
/// a callback (`_frames` start), then one tick per frame until JS reports
/// none left.
class FuseFrameClock {
  FuseFrameClock(this._channels, {required this.applySyncOps}) {
    _channels.on('_frames', (data) {
      if (data['op'] == 'start') _start();
      return null;
    });
  }

  final FuseChannels _channels;

  /// Applies the ops a synchronous reply carries (see `syncOps` in renderer.ts).
  final void Function(Object? ops) applySyncOps;

  FuseFrameMode mode = FuseFrameMode.ahead;
  final stats = FuseFrameStats();

  bool _running = false;
  // JS asked to start while a tick was out: keep going whatever it replies.
  bool _restart = false;
  // The ahead tick being waited for, by number; replies to older ones are
  // stale (a held frame already took their ops).
  int _seq = 0;
  int? _inFlight;
  bool _more = false;

  void _start() {
    if (_running) {
      _restart = true;
      return;
    }
    _running = true;
    _schedule();
  }

  void _schedule() {
    final binding = SchedulerBinding.instance;
    switch (mode) {
      case FuseFrameMode.ahead:
        binding.addPostFrameCallback(_ahead);
      case FuseFrameMode.sync:
        binding.scheduleFrameCallback(_sync);
    }
    binding.scheduleFrame();
  }

  void _next(bool more) {
    if (more || _restart) {
      _restart = false;
      _schedule();
    } else {
      _running = false;
    }
  }

  static bool _moreIn(Object? reply) => reply is Map && reply['more'] == true;

  // The time between frames, from the display; 60 Hz when it is unknown.
  Duration get _interval {
    final views = WidgetsBinding.instance.platformDispatcher.views;
    final rate = views.isEmpty ? 0.0 : views.first.display.refreshRate;
    return Duration(microseconds: (1e6 / (rate > 0 ? rate : 60)).round());
  }

  static double _ms(Duration d) => d.inMicroseconds / 1000.0;

  // After frame N: tick JS for N+1, and look at the reply at vsync N+1.
  void _ahead(Duration frame) {
    final seq = ++_seq;
    _inFlight = seq;
    stats.ticks++;
    final watch = Stopwatch()..start();
    _channels
        .call('_frame', {'t': _ms(frame + _interval)}, timeout: null)
        .then(
          (reply) {
            if (_inFlight != seq) return;
            _inFlight = null;
            _more = _moreIn(reply);
            stats.replyMicros += watch.elapsedMicroseconds;
          },
          onError: (Object e) {
            // Engine retired (hot restart): stop. JS starts the clock again.
            debugPrint('[Fuse] frame tick failed: $e');
            _inFlight = null;
            _more = false;
          },
        );
    SchedulerBinding.instance.scheduleFrameCallback(_atVsync);
  }

  void _atVsync(Duration _) {
    if (_inFlight != null) {
      // JS is still on it: wait for the rest and take its ops with us.
      _inFlight = null;
      final watch = Stopwatch()..start();
      try {
        final reply = _channels.callSync('_frameWait', const {});
        if (reply is Map) {
          applySyncOps(reply['ops']);
          _more = _moreIn(reply['result']);
        }
      } catch (e) {
        debugPrint('[Fuse] frame tick failed: $e');
        _more = false;
      }
      stats._blocked(watch.elapsedMicroseconds);
    }
    _next(_more);
  }

  void _sync(Duration frame) {
    final watch = Stopwatch()..start();
    stats.ticks++;
    Object? reply;
    try {
      reply = _channels.callSync('_frameSync', {'t': _ms(frame)});
      if (reply is Map) applySyncOps(reply['ops']);
    } catch (e) {
      debugPrint('[Fuse] frame tick failed: $e');
    }
    stats._blocked(watch.elapsedMicroseconds);
    _next(_moreIn(reply is Map ? reply['result'] : null));
  }
}
