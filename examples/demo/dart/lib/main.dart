import 'package:flutter/widgets.dart';
import 'package:solid_fuse/solid_fuse.dart';

import '_generated/fuse_packages.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final runtime = await FuseRuntime.create();
  registerFusePackages(runtime);
  await runtime.start();

  // The app root (MaterialApp, theme, navigator) is in JS: src/index.tsx.
  runApp(FuseView(runtime: runtime));
}
