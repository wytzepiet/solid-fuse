// Frame clock benchmark: how long requestAnimationFrame work holds Flutter's
// UI thread, per number of prop writes a frame.
//
//   cd examples/demo && bun run build
//   cd dart && flutter run --profile -d linux -t lib/frame_bench.dart
import 'dart:async';
import 'dart:ui';

import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';
import 'package:solid_fuse/solid_fuse.dart';

import '_generated/fuse_packages.dart';

void main() async {
  FuseBinding.ensureInitialized();
  final runtime = await FuseRuntime.create();
  registerFusePackages(runtime);
  await runtime.start();
  runApp(FuseView(runtime: runtime));

  final timings = <FrameTiming>[];
  SchedulerBinding.instance.addTimingsCallback(timings.addAll);
  await Future<void>.delayed(const Duration(seconds: 3));

  final clock = runtime.frameClock!;
  final channels = runtime.channels!;

  // The async call's round trip, split at the JS handler (wall clock, ms).
  final there = <int>[], back = <int>[], total = <int>[];
  for (var i = 0; i < 60; i++) {
    final sent = DateTime.now().microsecondsSinceEpoch;
    final js = ((await channels.call('benchPing', {})) as num).toInt() * 1000;
    final done = DateTime.now().microsecondsSinceEpoch;
    there.add(js - sent);
    back.add(done - js);
    total.add(done - sent);
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
  int med(List<int> l) => (l..sort())[l.length ~/ 2];
  debugPrint('[bench] async call round trip median ${med(total)}us: to JS ~${med(there)}us, back ~${med(back)}us (JS clock in ms)');
  final syncTimes = <int>[];
  for (var i = 0; i < 60; i++) {
    final w = Stopwatch()..start();
    channels.callSync('_frameNoop', const {});
    syncTimes.add(w.elapsedMicroseconds);
  }
  debugPrint('[bench] sync call round trip median ${med(syncTimes)}us');
  for (final count in [10, 64, 200]) {
    channels.send('benchFrames', {'count': count});
    await Future<void>.delayed(const Duration(milliseconds: 800));
    clock.stats.reset();
    timings.clear();
    await Future<void>.delayed(const Duration(seconds: 3));
    final s = clock.stats;
    final builds = timings.map((t) => t.buildDuration.inMicroseconds).toList()..sort();
    int p(double q) => builds.isEmpty ? 0 : builds[((builds.length - 1) * q).round()];
    final frameUs = 1e6 / (PlatformDispatcher.instance.views.first.display.refreshRate);
    final slow = builds.where((b) => b > frameUs).length;
    debugPrint(
      '[bench] $count writes: $s | frames ${builds.length}, '
      'UI thread per frame median ${p(.5)}us p95 ${p(.95)}us, over budget $slow',
    );
    channels.send('benchFrames', {});
    await Future<void>.delayed(const Duration(milliseconds: 800));
  }
  debugPrint('[bench] done');
}
