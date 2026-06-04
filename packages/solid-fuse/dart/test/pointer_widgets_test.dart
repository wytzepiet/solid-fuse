// Fast headless widget tests for the pointer widgets: Listener, IgnorePointer,
// AbsorbPointer. No JS engine, no macOS device, no FFI — we build FuseNodes by
// hand (the renderer's wire form: function props are `true`) and pump the Dart
// builders directly. Runs in ~1s via `flutter test`.
//
// These cover the only logic that lives on the Dart side: prop mapping/defaults
// and the pointer-event serialization the JS callbacks receive. (The hit-test
// blocking itself is Flutter's own IgnorePointer/AbsorbPointer; we assert the
// prop reaches them rather than re-testing the framework.)

import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/src/node.dart';
import 'package:solid_fuse/src/widgets/absorb_pointer.dart';
import 'package:solid_fuse/src/widgets/ignore_pointer.dart';
import 'package:solid_fuse/src/widgets/listener.dart';

/// Records the (name, value) of every callback the widgets fire back over the
/// bridge, so a test can assert what JS would have received.
class _Recorder {
  _Recorder() {
    registry = FuseNodeRegistry(
      callFunction: (id, name, [value]) => calls.add((name, value)),
      callFunctionAsync: (id, name, [value]) async => null,
    );
  }

  late final FuseNodeRegistry registry;
  final List<(String, dynamic)> calls = [];
  int _nextId = 1;

  FuseNode node(String type, Map<String, dynamic> props) =>
      registry.create(_nextId++, type, props);

  /// First recorded value for [name], or null.
  Map<String, dynamic>? value(String name) {
    for (final (n, v) in calls) {
      if (n == name) return Map<String, dynamic>.from(v as Map);
    }
    return null;
  }
}

/// Pump [child] forced to a 200×200 hit area (tight constraints size the
/// otherwise-childless proxy box so real gestures land on it).
Future<void> pumpSized(WidgetTester tester, Widget child) {
  return tester.pumpWidget(
    Directionality(
      textDirection: TextDirection.ltr,
      child: Center(child: SizedBox(width: 200, height: 200, child: child)),
    ),
  );
}

void main() {
  group('Listener', () {
    testWidgets('serializes down / move / up with position and delta',
        (tester) async {
      final r = _Recorder();
      final node = r.node('listener', {
        'behavior': 'opaque',
        'onPointerDown': true,
        'onPointerMove': true,
        'onPointerUp': true,
      });

      await pumpSized(tester, FuseListener(node));

      final center = tester.getCenter(find.byType(Listener));
      final gesture = await tester.startGesture(center);
      await gesture.moveBy(const Offset(15, 25));
      await gesture.up();

      final names = r.calls.map((c) => c.$1).toList();
      expect(names, containsAllInOrder(['onPointerDown', 'onPointerMove', 'onPointerUp']));

      final down = r.value('onPointerDown')!;
      expect(down['x'], closeTo(center.dx, 0.01), reason: 'global x');
      expect(down['y'], closeTo(center.dy, 0.01));
      expect(down['kind'], 'touch');
      expect(down, contains('buttons'));
      expect(down, contains('pressure'));

      final move = r.value('onPointerMove')!;
      expect(move['dx'], closeTo(15, 0.01), reason: 'delta since last event');
      expect(move['dy'], closeTo(25, 0.01));
    });

    testWidgets('reports scroll signals with scroll delta', (tester) async {
      final r = _Recorder();
      final node = r.node('listener', {'behavior': 'opaque', 'onPointerSignal': true});

      await pumpSized(tester, FuseListener(node));

      final center = tester.getCenter(find.byType(Listener));
      final testPointer = TestPointer(1, PointerDeviceKind.mouse);
      testPointer.hover(center);
      await tester.sendEventToBinding(
        testPointer.scroll(const Offset(0, 40)),
      );

      final signal = r.value('onPointerSignal')!;
      expect(signal['scrollDeltaY'], closeTo(40, 0.01));
      expect(signal['scrollDeltaX'], closeTo(0, 0.01));
    });
  });

  group('IgnorePointer', () {
    testWidgets('defaults to ignoring = true', (tester) async {
      final r = _Recorder();
      await pumpSized(tester, FuseIgnorePointer(r.node('ignorePointer', {})));
      expect(tester.widget<IgnorePointer>(find.byType(IgnorePointer)).ignoring, isTrue);
    });

    testWidgets('honors ignoring = false', (tester) async {
      final r = _Recorder();
      await pumpSized(
        tester,
        FuseIgnorePointer(r.node('ignorePointer', {'ignoring': false})),
      );
      expect(tester.widget<IgnorePointer>(find.byType(IgnorePointer)).ignoring, isFalse);
    });
  });

  group('AbsorbPointer', () {
    testWidgets('defaults to absorbing = true', (tester) async {
      final r = _Recorder();
      await pumpSized(tester, FuseAbsorbPointer(r.node('absorbPointer', {})));
      expect(tester.widget<AbsorbPointer>(find.byType(AbsorbPointer)).absorbing, isTrue);
    });

    testWidgets('honors absorbing = false', (tester) async {
      final r = _Recorder();
      await pumpSized(
        tester,
        FuseAbsorbPointer(r.node('absorbPointer', {'absorbing': false})),
      );
      expect(tester.widget<AbsorbPointer>(find.byType(AbsorbPointer)).absorbing, isFalse);
    });
  });
}
