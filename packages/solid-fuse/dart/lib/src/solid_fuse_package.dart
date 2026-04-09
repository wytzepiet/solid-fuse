import 'handles/scroll_controller_handle.dart';
import 'widgets/gesture_detector.dart';
import 'widgets/navigator.dart';
import 'widgets/positioned.dart';
import 'widgets/scroll_view.dart';
import 'widgets/stack.dart';
import 'widgets/text.dart';
import 'widgets/view.dart';

import 'runtime.dart';

/// Registers all built-in Fuse widgets (view, text, gestureDetector, etc.)
///
/// This is the core package — it should always be registered first.
void register(FuseRuntime runtime) {
  runtime.registerWidget('view', FuseViewWidget.new);
  runtime.registerWidget('text', FuseText.new);
  runtime.registerWidget('gestureDetector', FuseGestureDetector.new);
  runtime.registerWidget(
    'navigator',
    FuseNavigatorWidget.new,
    updateOnNodeChange: false,
  );
  runtime.registerWidget('scrollView', FuseScrollView.new);
  runtime.registerWidget('stack', FuseStack.new);
  runtime.registerWidget('positioned', FusePositioned.new);

  // Handles
  runtime.registerHandle('scrollController', ScrollControllerHandle.new);
}
