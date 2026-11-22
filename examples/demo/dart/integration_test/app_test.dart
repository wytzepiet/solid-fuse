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

    // Keyed list: reorders move the existing rows (remove + insert of the
    // same node in one batch), and the screen follows.
    await tester.tap(find.text('list'));
    await pumpUntil(tester, find.text('Reverse'));
    await tester.pumpAndSettle();
    List<String> onScreen() {
      const all = ['apple', 'banana', 'cherry', 'date', 'elder'];
      final shown = all.where((r) => find.text(r).evaluate().isNotEmpty).toList();
      shown.sort((a, b) => tester
          .getTopLeft(find.text(a))
          .dy
          .compareTo(tester.getTopLeft(find.text(b)).dy));
      return shown;
    }

    Future<void> tapAndExpect(String button, List<String> order) async {
      await tester.tap(find.text(button));
      for (var i = 0; i < 100 && onScreen().join() != order.join(); i++) {
        await tester.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 20)));
        await tester.pump();
      }
      expect(onScreen(), order);
    }

    expect(onScreen(), ['cherry', 'apple', 'elder', 'banana', 'date']);
    // Static attribute on an intrinsic element: each row is 40 high, plus
    // the list's gap of 12.
    expect(
      tester.getTopLeft(find.text('apple')).dy -
          tester.getTopLeft(find.text('cherry')).dy,
      52,
    );
    await tapAndExpect('Reverse', ['date', 'banana', 'elder', 'apple', 'cherry']);
    await tapAndExpect('Sort', ['apple', 'banana', 'cherry', 'date', 'elder']);
    await tapAndExpect('Thin', ['apple', 'cherry', 'elder']);
    await tapAndExpect('Reverse', ['elder', 'cherry', 'apple']);

    // Back to the menu: pop the Fuse navigator (the innermost one).
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('counter'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('counter'));
    await pumpUntil(tester, find.text('Reset'));
    await tester.pumpAndSettle();
    expect(find.text('0'), findsOneWidget);

    await tester.tap(find.text('+'));
    await pumpUntil(tester, find.text('1'));
  });
}
