// End-to-end smoke test: the real demo bundle (compiled by `fuse build`) runs
// in QuickJS, mounts through the renderer, and drives native widgets. Covers
// the compiler output, the ops wire format, Navigator push, and a tap that
// round-trips JS → Dart → JS.
//
//   cd examples/demo && bun run build   # writes dart/assets/js/bundle.js
//   cd dart && flutter test integration_test/app_test.dart -d <device>

import 'package:cupertino_ui/cupertino_ui.dart' show CupertinoSwitch;
import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:heroine/heroine.dart';
import 'package:integration_test/integration_test.dart';
import 'package:solid_fuse/solid_fuse.dart';

import 'package:demo/_generated/fuse_packages.dart';

Future<void> pumpUntil(WidgetTester tester, Finder finder) async {
  // Up to 5 s: a cold first run (JIT, first route) can be slow.
  for (var i = 0; i < 250; i++) {
    await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)));
    await tester.pump();
    if (finder.evaluate().isNotEmpty) return;
  }
  fail('timed out waiting for $finder');
}

/// Lets animations run on a screen that never settles (a spinner).
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
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

    // The app root (MaterialApp) is rendered by JS.
    await tester.pumpWidget(FuseView(runtime: runtime));
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

    // textField is @solid-fuse/material's: a material_ui TextField under the
    // MaterialApp JS renders.
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('textField'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('textField'));
    await pumpUntil(tester, find.byType(TextField));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Hi');
    await pumpUntil(tester, find.text('value = "Hi"'));

    // A generated ListView.builder: Flutter asks JS for each row
    // synchronously as it scrolls in. The rows stay reactive.
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('builder'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('builder'));
    await pumpUntil(tester, find.text('Row 0'));
    await tester.pumpAndSettle();
    expect(find.text('Row 2'), findsOneWidget);
    await tester.tap(find.text('Row 2'));
    await pumpUntil(tester, find.text('Picked row 2'));
    final list = find.byType(Scrollable).last;
    for (var i = 0; i < 20; i++) {
      await tester.drag(list, const Offset(0, -2000));
      await tester.pump();
    }
    await tester.pumpAndSettle();
    expect(find.text('Row 0'), findsNothing);
    // The ScrollPosition JS borrowed from the controller mirrors its pixels.
    await pumpUntil(tester, find.textContaining(RegExp(r'Scrolled [1-9]\d* px')));
    final shown = [
      for (var i = 0; i < 10000; i++)
        if (find.text('Row $i').evaluate().isNotEmpty) i,
    ];
    expect(shown, isNotEmpty);
    expect(shown.first, greaterThan(500));
    await tester.tap(find.text('Row ${shown[1]}'));
    await pumpUntil(tester, find.text('Picked row ${shown[1]}'));

    // @solid-fuse/material: generated widgets behind thin components.
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('material'));
    await settle(tester);
    await tester.tap(find.text('material'));
    await pumpUntil(tester, find.byType(Scaffold));
    await settle(tester);
    expect(find.byType(FilledButton), findsWidgets);
    expect(find.byIcon(Icons.settings), findsOneWidget);
    await tester.tap(find.byType(Switch).first);
    await pumpUntil(tester, find.textContaining('switch off'));
    await tester.tap(find.byType(FloatingActionButton));
    await pumpUntil(tester, find.text('Tab 0, FAB pressed 1 times'));
    await tester.tap(find.text('Saved'));
    await pumpUntil(tester, find.text('Tab 1, FAB pressed 1 times'));
    // The radios join core's RadioGroup.
    await tester.tap(find.byType(Radio<Object?>).last);
    await pumpUntil(tester, find.text('plan = pro'));
    // A dialog is a component with `open`; Cancel closes it from JS.
    await tester.tap(find.text('Dialog'));
    await pumpUntil(tester, find.text('Discard draft?'));
    await settle(tester);
    await tester.tap(find.text('Cancel'));
    for (var i = 0; i < 100 && find.text('Discard draft?').evaluate().isNotEmpty; i++) {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 20)));
      await tester.pump();
    }
    expect(find.text('Discard draft?'), findsNothing);
    // A barrier tap closes it from Dart; JS hears onOpenChange(false) and
    // can open it again.
    await tester.tap(find.text('Dialog'));
    await pumpUntil(tester, find.text('Discard draft?'));
    await settle(tester);
    await tester.tapAt(const Offset(5, 5));
    await settle(tester);
    expect(find.text('Discard draft?'), findsNothing);
    await tester.tap(find.text('Dialog'));
    await pumpUntil(tester, find.text('Discard draft?'));
    await settle(tester);
    await tester.tap(find.text('Cancel'));
    await settle(tester);

    // @solid-fuse/cupertino.
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('cupertino'));
    await settle(tester);
    await tester.tap(find.text('cupertino'));
    await pumpUntil(tester, find.text('Week'));
    await settle(tester);
    await tester.tap(find.text('Week'));
    await pumpUntil(tester, find.textContaining('view = week'));
    await tester.tap(find.text('Wi-Fi'));
    await pumpUntil(tester, find.textContaining('last action: wi-fi'));
    await tester.tap(find.text('Alert'));
    await pumpUntil(tester, find.text('Allow'));
    await settle(tester);
    await tester.tap(find.text('Allow'));
    await pumpUntil(tester, find.textContaining('last action: allow'));
    await settle(tester);
    expect(find.text('Allow notifications?'), findsNothing);

    // Core's design-free widgets.
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('core widgets'));
    await settle(tester);
    await tester.tap(find.text('core widgets'));
    await pumpUntil(tester, find.text('Pressed 0 times'));
    await settle(tester);
    await tester.tap(find.text('Pressed 0 times'));
    await pumpUntil(tester, find.text('Pressed 1 times'));
    await tester.enterText(find.byType(EditableText), 'abc');
    await pumpUntil(tester, find.text('input = "abc"'));
    await tester.tap(find.text('set from JS'));
    await pumpUntil(tester, find.text('input = "from JS"'));
    expect(tester.widget<EditableText>(find.byType(EditableText)).controller.text, 'from JS');
    await tester.tap(find.text('fruit: apple'));
    await pumpUntil(tester, find.text('cherry'));
    await settle(tester);
    await tester.tap(find.text('cherry'));
    await pumpUntil(tester, find.text('fruit: cherry'));
    // Let the menu finish closing: until then its barrier takes the tap.
    await settle(tester);
    await tester.tap(find.text('open dialog'));
    await pumpUntil(tester, find.text('Core dialog'));
    await settle(tester);
    await tester.tap(find.text('close'));
    await settle(tester);
    for (var i = 0; i < 100 && find.text('Core dialog').evaluate().isNotEmpty; i++) {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 20)));
      await settle(tester);
    }
    expect(find.text('Core dialog'), findsNothing);

    // Lucide: a third-party icon font, all generated from its fuse.dart.
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('icon'));
    await settle(tester);
    await tester.tap(find.text('icon'));
    // Below the fold: find the widget, not the semantics node.
    final lucide = find.byWidgetPredicate((w) => w is Semantics && w.properties.identifier == 'lucide-heart');
    await settle(tester);
    await pumpUntil(tester, lucide);
    final heart = tester.widget<Icon>(find.descendant(of: lucide, matching: find.byType(Icon)));
    expect(heart.icon?.fontFamily, 'lucide');

    // Springs: requestAnimationFrame ticks JS inside each frame; a spring
    // set from a tap moves there and its promise settles, twice in a row.
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('springs'));
    await tester.ensureVisible(find.text('springs'));
    await settle(tester);
    await tester.tap(find.text('springs'));
    await pumpUntil(tester, find.bySemanticsIdentifier('run'));
    await settle(tester);
    await tester.tap(find.bySemanticsIdentifier('run'));
    final runBox = find.descendant(of: find.bySemanticsIdentifier('run'), matching: find.byType(Transform));
    var furthest = 0.0;
    for (var i = 0; i < 400 && find.text('done').evaluate().isEmpty; i++) {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 2)));
      await tester.pump(const Duration(milliseconds: 16));
      if (runBox.evaluate().isNotEmpty) {
        final dx = tester.widget<Transform>(runBox.first).transform.getTranslation().x;
        if (dx > furthest) furthest = dx;
      }
    }
    expect(find.text('done'), findsOneWidget);
    expect(furthest, closeTo(160, 1));

    // host.size() follows the view.
    tester.view.physicalSize = const Size(1600, 900) * tester.view.devicePixelRatio;
    addTearDown(tester.view.resetPhysicalSize);
    await pumpUntil(tester, find.text('1600 x 900, landscape'));

    // Heroine: the app's Navigator observes with a HeroineController, and a
    // tile flies into a heroinePage and back.
    expect(tester.widget<Navigator>(find.byType(Navigator).last).observers.whereType<HeroineController>(), hasLength(1));
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('heroine'));
    await tester.ensureVisible(find.text('heroine'));
    await settle(tester);
    await tester.tap(find.text('heroine'));
    final tile = find.bySemanticsIdentifier('heroine-#db2777');
    await pumpUntil(tester, tile);
    await settle(tester);
    await tester.tap(tile);
    final big = find.bySemanticsIdentifier('heroine-big');
    await pumpUntil(tester, big);
    final sizes = <double>{};
    for (var i = 0; i < 60; i++) {
      await tester.pump(const Duration(milliseconds: 16));
      final heroine = find.byType(Heroine);
      for (final e in heroine.evaluate()) {
        final box = e.renderObject as RenderBox?;
        if (box != null && box.hasSize) sizes.add(box.size.width.roundToDouble());
      }
    }
    await settle(tester);
    expect(tester.getSize(big).width, 280);
    expect(sizes.any((w) => w > 72 && w < 280), isTrue, reason: 'the tile flies: sizes seen $sizes');
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await settle(tester);
    await settle(tester);
    expect(big, findsNothing);
    expect(tile, findsOneWidget);

    // Adaptive: flipping AdaptiveApp's platform restyles the screen in
    // place (state kept) and switches Flutter's platform with it.
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('adaptive'));
    await settle(tester);
    await tester.tap(find.text('adaptive'));
    await pumpUntil(tester, find.text('design: material'));
    await settle(tester);
    expect(find.byType(Switch), findsOneWidget);
    await tester.tap(find.byType(Switch));
    for (var i = 0; i < 100 && tester.widget<Switch>(find.byType(Switch)).value; i++) {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 20)));
      await tester.pump();
    }
    expect(tester.widget<Switch>(find.byType(Switch)).value, false);

    await tester.tap(find.text('design: material'));
    await pumpUntil(tester, find.byType(CupertinoSwitch));
    await settle(tester);
    expect(find.text('design: cupertino'), findsOneWidget);
    expect(find.byType(Switch), findsNothing);
    expect(tester.widget<CupertinoSwitch>(find.byType(CupertinoSwitch)).value, false);
    expect(Theme.of(tester.element(find.byType(CupertinoSwitch))).platform, TargetPlatform.iOS);

    await tester.tap(find.text('design: cupertino'));
    await pumpUntil(tester, find.byType(Switch));
    await settle(tester);
    expect(Theme.of(tester.element(find.byType(Switch))).platform, TargetPlatform.android);

    // Routes: typed params and parents, a layout with its own stack, and
    // a link from the OS opening a page with its parents below it.
    tester.state<NavigatorState>(find.byType(Navigator).last).pop();
    await pumpUntil(tester, find.text('routes'));
    await settle(tester);
    await tester.ensureVisible(find.text('routes'));
    await settle(tester);
    await tester.tap(find.text('routes'));
    await pumpUntil(tester, find.text('Grace'));
    await settle(tester);
    await tester.tap(find.text('Grace'));
    await pumpUntil(tester, find.text('User Grace'));
    await settle(tester);
    await tester.tap(find.text('Share'));
    await pumpUntil(tester, find.text('Share home'));
    await settle(tester);
    expect(find.text('Share flow'), findsOneWidget);
    // Its transition is written in JS: Flutter's widgets on the route's animation.
    expect(find.ancestor(of: find.text('Share flow'), matching: find.byType(ScaleTransition)), findsOneWidget);
    expect(tester.widget<ScaleTransition>(find.ancestor(of: find.text('Share flow'), matching: find.byType(ScaleTransition))).scale.value, 1);
    await tester.tap(find.text('Pick contact'));
    await pumpUntil(tester, find.text('Contact picker'));
    await settle(tester);
    // The banner is the layout's, around its own Navigator: it stays.
    expect(find.text('Share flow'), findsOneWidget);
    await tester.tap(find.text('Back'));
    await pumpUntil(tester, find.text('Share home'));
    await settle(tester);
    await tester.tap(find.text('Close'));
    await pumpUntil(tester, find.text('User Grace'));
    await settle(tester);

    // The OS opens /users/2: the stack becomes home, People, User Linus.
    await tester.runAsync(() async {
      final message = const JSONMethodCodec().encodeMethodCall(
        const MethodCall('pushRouteInformation', {'location': '/users/2', 'state': null}),
      );
      await tester.binding.defaultBinaryMessenger.handlePlatformMessage('flutter/navigation', message, (_) {});
    });
    await pumpUntil(tester, find.text('User Linus'));
    await settle(tester);
    await tester.tap(find.text('Back'));
    await pumpUntil(tester, find.text('Ada'));
    await settle(tester);
    // nav.go from JS opens the layout with its first page below the link's.
    await tester.tap(find.text('Open /share/contact'));
    await pumpUntil(tester, find.text('Contact picker'));
    await settle(tester);
    await tester.tap(find.text('Back'));
    await pumpUntil(tester, find.text('Share home'));
    await settle(tester);
    await tester.tap(find.text('Close'));
    await pumpUntil(tester, find.text('solid-fuse demos'));
    await settle(tester);

    // Tabs: a stack per tab, and the back button goes to the visible one.
    Future<void> systemBack() => tester.runAsync(() async {
          final message = const JSONMethodCodec().encodeMethodCall(const MethodCall('popRoute'));
          await tester.binding.defaultBinaryMessenger.handlePlatformMessage('flutter/navigation', message, (_) {});
        });
    Future<void> tapAndWait(String label, String shows) async {
      await tester.tap(find.text(label));
      await pumpUntil(tester, find.text(shows));
      await settle(tester);
    }

    await tester.ensureVisible(find.text('tabs'));
    await settle(tester);
    await tapAndWait('tabs', 'Open post');
    await tapAndWait('Open post', 'Post 1');
    expect(find.text('Feed tab'), findsOneWidget, reason: 'the bar stays');
    await tapAndWait('Profile tab', 'Profile');
    await tapAndWait('Open video', 'Video 8');
    // A post belongs to the feed tab: it opens there and shows it.
    await tapAndWait('Post about it', 'Post 8');
    // Back pops the visible tab only; the profile tab keeps its video.
    await systemBack();
    await pumpUntil(tester, find.text('Post 1'));
    await settle(tester);
    await tapAndWait('Profile tab', 'Video 8');
    await systemBack();
    await pumpUntil(tester, find.text('Settings'));
    await settle(tester);
    // On a tab's first page, back goes to the first tab.
    await systemBack();
    await pumpUntil(tester, find.text('Post 1'));
    await settle(tester);
    await tapAndWait('Profile tab', 'Settings');
    // Settings sits on the root stack, over the bar.
    await tapAndWait('Settings', 'Done');
    expect(find.text('Feed tab'), findsNothing);
    await tapAndWait('Done', 'Profile');
    // Tapping the visible tab again pops it to its first page.
    await tapAndWait('Feed tab', 'Post 1');
    await tapAndWait('Feed tab', 'Open post');
    // Back on the first tab's first page leaves the tabs.
    await systemBack();
    await pumpUntil(tester, find.text('solid-fuse demos'));
  });
}
