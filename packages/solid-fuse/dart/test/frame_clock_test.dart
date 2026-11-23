// requestAnimationFrame's clock: JS is called at the start of a frame and
// what it changed is drawn in that same frame.
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/solid_fuse.dart';

void main() {
  late FuseRuntime rt;
  late FuseFrameClock clock;
  late List<double> times;
  var batch = 0;

  // Stands in for src/frames.ts: each tick sets the text to the tick's
  // time, and asks for [frames] ticks in all.
  void setUpClock(int frames) {
    times = [];
    clock = FuseFrameClock(
      callSync: (channel, data) {
        expect(channel, '_frame');
        final t = data['t'] as double;
        times.add(t);
        return {
          'result': {'more': times.length < frames},
          'ops': {
            'v': FuseRuntime.opsVersion,
            'g': 1,
            'batches': [
              [
                batch++,
                jsonEncode([3, 2, 'tick ${times.length}']),
              ],
            ],
          },
        };
      },
      applySyncOps: rt.applySyncOps,
    );
  }

  setUp(() {
    rt = FuseRuntime.forTest();
    registerSolidFuse(rt);
    rt.applyOps([1, 2, 'idle', 4, 0, 2, null]);
  });

  Widget app() => WidgetsApp(
        color: const Color(0xFF000000),
        pageRouteBuilder: <T>(settings, builder) =>
            PageRouteBuilder<T>(settings: settings, pageBuilder: (c, _, _) => builder(c)),
        home: FuseView(runtime: rt),
      );

  testWidgets('a tick is drawn in the frame that ran it', (tester) async {
    setUpClock(3);
    await tester.pumpWidget(app());
    expect(find.text('idle'), findsOneWidget);

    clock.start();
    await tester.pump(const Duration(milliseconds: 16));
    expect(find.text('tick 1'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 16));
    expect(find.text('tick 2'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 16));
    expect(find.text('tick 3'), findsOneWidget);
    expect(times[1] - times[0], 16);
  });

  testWidgets('stops when JS has nothing queued, starts again when it does', (tester) async {
    setUpClock(2);
    await tester.pumpWidget(app());
    clock.start();
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 16));
    }
    expect(times, hasLength(2));
    expect(tester.binding.hasScheduledFrame, isFalse);

    setUpClock(1);
    clock.start();
    await tester.pump(const Duration(milliseconds: 16));
    expect(times, hasLength(1));
    expect(find.text('tick 1'), findsOneWidget);
  });
}
