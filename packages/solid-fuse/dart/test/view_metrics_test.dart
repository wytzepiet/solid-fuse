// `host`'s view metrics (src/host.ts) come from the app's view, in logical
// pixels.
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/solid_fuse.dart' show fuseViewMetrics;

void main() {
  testWidgets('size, insets and text scale in logical pixels', (tester) async {
    tester.view
      ..physicalSize = const Size(800, 1200)
      ..devicePixelRatio = 2
      ..padding = const FakeViewPadding(top: 48)
      ..viewInsets = const FakeViewPadding(bottom: 600);
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearAllTestValues);

    final m = fuseViewMetrics();
    expect(m['size'], {'width': 400.0, 'height': 600.0});
    expect(m['devicePixelRatio'], 2.0);
    expect(m['padding'], {'left': 0.0, 'top': 24.0, 'right': 0.0, 'bottom': 0.0});
    expect(m['viewInsets'], {'left': 0.0, 'top': 0.0, 'right': 0.0, 'bottom': 300.0});
    expect(m['textScale'], 1.5);
  });
}
