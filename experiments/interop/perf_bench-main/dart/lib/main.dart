// perf_bench: Dart driver of the render benchmark. Runs the suites named in
// $BENCH (comma separated: core, native, micro; default core), prints one
// `BENCH {json}` line per measurement and exits.
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:solid_fuse/solid_fuse.dart';

import '_generated/fuse_packages.dart';
import 'harness.dart';
import 'suite.dart';

void main() async {
  BenchBinding();
  rt = await FuseRuntime.create();
  registerFusePackages(rt);
  await rt.start();
  ch = rt.perfChannels!;
  installHooks();
  runApp(MaterialApp(
    debugShowCheckedModeBanner: false,
    home: Material(
      child: ValueListenableBuilder<int>(
        valueListenable: nativeCards,
        builder: (_, n, _) => n == 0 ? FuseView(runtime: rt) : NativeScreen(n),
      ),
    ),
  ));
  await SchedulerBinding.instance.endOfFrame;
  await settle(500);

  final info = await cmd('info');
  final view = WidgetsBinding.instance.platformDispatcher.views.first;
  emit('meta', 'env', {
    'jsClock': info['clock'],
    'cores': Platform.numberOfProcessors,
    'dart': Platform.version.split(' ').first,
    'semantics': !BenchBinding.noSemantics,
    'window': '${view.physicalSize.width.round()}x${view.physicalSize.height.round()}@${view.devicePixelRatio}',
    'refreshHz': view.display.refreshRate,
  });

  final suites = (env['BENCH'] ?? 'core').split(',');
  final all = <String, Future<void> Function()>{'core': core, 'native': native, 'micro': micro};
  for (final s in suites) {
    final fn = all[s.trim()];
    if (fn == null) continue;
    try {
      await fn();
    } catch (e, st) {
      // ignore: avoid_print
      print('BENCH_ERROR suite $s: $e\n$st');
    }
    await flushPending();
  }
  // ignore: avoid_print
  print('BENCH_DONE');
  exit(0);
}
