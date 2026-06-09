import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';

import 'channels.dart';

/// Drives `requestAnimationFrame` from Flutter's real vsync.
///
/// The JS rAF shim (src/polyfills.ts) queues callbacks and sends a
/// fire-and-forget `_raf` `wake` when its queue goes from empty to non-empty.
/// We then tick JS once per frame via [SchedulerBinding.scheduleFrameCallback],
/// passing [SchedulerBinding.currentFrameTimeStamp] — a monotonic clock that,
/// unlike a [Ticker]'s `elapsed`, does NOT reset when we stop and restart the
/// loop while idle. Each `_rafTick` returns whether callbacks remain; when none
/// do, we stop scheduling and idle until the next `wake`. Nothing ticks when
/// nothing is animating.
///
/// One per [FuseChannels] (i.e. per engine). Registers the `_raf` handler in
/// its constructor.
class FuseRafDriver {
  FuseRafDriver(this._channels) {
    _channels.on('_raf', (data) {
      if (data['op'] == 'wake') _ensureScheduled();
      return null;
    });
  }

  final FuseChannels _channels;

  /// A frame callback is registered and awaiting its vsync. Guards against
  /// double-scheduling when a `wake` arrives mid-loop.
  bool _scheduled = false;

  void _ensureScheduled() {
    if (_scheduled) return;
    _scheduled = true;
    // scheduleFrameCallback also requests a frame, so an otherwise-idle app
    // still produces the vsync we need.
    SchedulerBinding.instance.scheduleFrameCallback(_onFrame);
  }

  Future<void> _onFrame(Duration _) async {
    _scheduled = false;
    // Monotonic frame time in milliseconds — the high-res timestamp rAF
    // callbacks expect. currentFrameTimeStamp is valid for the frame in flight
    // (this runs as a transient callback during the begin-frame phase).
    final ts =
        SchedulerBinding.instance.currentFrameTimeStamp.inMicroseconds / 1000.0;
    try {
      final result = await _channels.call('_rafTick', {'ts': ts});
      if (result is Map && result['more'] == true) _ensureScheduled();
    } catch (e) {
      // Engine retired (hot restart) or a tick failed: stop driving. JS will
      // send a fresh `wake` against the live engine if it's still animating.
      debugPrint('[Fuse] raf tick error: $e');
    }
  }
}
