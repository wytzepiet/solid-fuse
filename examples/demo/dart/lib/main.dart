import 'package:flutter/material.dart';
import 'package:solid_fuse/solid_fuse.dart';

import '_generated/fuse_packages.dart';
import 'bridge_bench.dart';

/// Dev flag: run the JS<->Dart bridge micro-benchmark on launch and print the
/// results to the console. Off by default; enable with
/// `fuse dev --dart-define=FUSE_BENCH=true`.
const _kRunBridgeBench = bool.fromEnvironment('FUSE_BENCH');

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final runtime = await FuseRuntime.create();
  registerFusePackages(runtime);
  await runtime.start();

  runApp(
    MaterialApp(
      title: 'solid-fuse demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      ),
      home: SafeArea(child: FuseView(runtime: runtime)),
    ),
  );

  if (_kRunBridgeBench) {
    WidgetsBinding.instance.addPostFrameCallback((_) => runBridgeBench(runtime));
  }
}
