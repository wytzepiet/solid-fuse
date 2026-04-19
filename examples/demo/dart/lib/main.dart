import 'package:flutter/material.dart';
import 'package:solid_fuse/solid_fuse.dart';

import '_generated/fuse_packages.dart';

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
}
