import 'widgets/gesture_detector.dart';
import 'widgets/navigator.dart';
import 'widgets/scroll_view.dart';
import 'widgets/stack.dart';
import 'widgets/text.dart';
import 'widgets/view.dart';

import 'runtime.dart';

/// Registers all built-in Fuse widgets (view, text, gestureDetector, etc.)
///
/// This is the core package — it should always be registered first.
void register(FuseRuntime runtime) {
  runtime.register('view', FuseViewWidget.new);
  runtime.register('text', FuseText.new);
  runtime.register('gestureDetector', FuseGestureDetector.new);
  runtime.register(
    'navigator',
    FuseNavigatorWidget.new,
    updateOnNodeChange: false,
  );
  runtime.register('scrollView', FuseScrollView.new);
  runtime.register('stack', FuseStack.new);
}
