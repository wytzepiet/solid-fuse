import 'fuse_package.dart';
import 'widgets/gesture_detector.dart';
import 'widgets/navigator.dart';
import 'widgets/scroll_view.dart';
import 'widgets/stack.dart';
import 'widgets/text.dart';
import 'widgets/view.dart';

/// Registers all built-in Fuse widgets (view, text, gestureDetector, etc.)
/// and pre-creates the root node.
///
/// This is the core package — it should always be registered first.
class SolidFuse extends FusePackage {
  @override
  void register(runtime) {
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

    // Pre-create root node so FuseView can access it synchronously.
    runtime.registry.clear();
    runtime.registry.create(0, 'root', {'_id': 0});
  }
}
