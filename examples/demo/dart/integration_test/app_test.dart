// End-to-end smoke test: the real demo bundle (compiled by `fuse build`) runs
// in QuickJS, mounts through the renderer, and drives native widgets. Covers
// the compiler output, the ops wire format, Navigator push, and a tap that
// round-trips JS → Dart → JS.
//
//   cd examples/demo && bun run build   # writes dart/assets/js/bundle.js
//   cd dart && flutter test integration_test/app_test.dart -d <device>

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:solid_fuse/solid_fuse.dart';

import 'package:demo/_generated/fuse_packages.dart';

Future<void> pumpUntil(WidgetTester tester, Finder finder) async {
  for (var i = 0; i < 100; i++) {
    await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)));
    await tester.pump();
    if (finder.evaluate().isNotEmpty) return;
  }
  fail('timed out waiting for $finder');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('demo mounts, navigates and reacts to taps', (tester) async {
    late FuseRuntime runtime;
    await tester.runAsync(() async {
      runtime = await FuseRuntime.create();
      registerFusePackages(runtime);
      await runtime.start();
    });

    await tester.pumpWidget(MaterialApp(home: FuseView(runtime: runtime)));
    await pumpUntil(tester, find.text('solid-fuse demos'));

    await tester.tap(find.text('counter'));
    await pumpUntil(tester, find.text('Reset'));
    await tester.pumpAndSettle();
    expect(find.text('0'), findsOneWidget);

    await tester.tap(find.text('+'));
    await pumpUntil(tester, find.text('1'));
  });
}
