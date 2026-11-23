// Frame clock benchmark: how long requestAnimationFrame work holds Flutter's
// UI thread, per mode and per number of prop writes a frame.
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
  for (final count in [10, 64, 200]) {
    for (final mode in FuseFrameMode.values) {
      clock.mode = mode;
      channels.send('benchFrames', {'count': count});
      await Future<void>.delayed(const Duration(milliseconds: 800));
      clock.stats.reset();
      timings.clear();
      await Future<void>.delayed(const Duration(seconds: 3));
      final s = clock.stats;
      final builds = timings.map((t) => t.buildDuration.inMicroseconds).toList()..sort();
      final p = (double q) => builds.isEmpty ? 0 : builds[((builds.length - 1) * q).round()];
      final frameUs = 1e6 / (PlatformDispatcher.instance.views.first.display.refreshRate);
      final slow = builds.where((b) => b > frameUs).length;
      debugPrint('[bench] $count writes, ${mode.name}: $s | frames ${builds.length}, '
          'UI thread per frame median ${p(.5)}us p95 ${p(.95)}us, over budget $slow');
      channels.send('benchFrames', {});
      await Future<void>.delayed(const Duration(milliseconds: 800));
    }
  }
  debugPrint('[bench] done');
}
