import 'handles/page.dart';
import 'runtime.dart';
import 'widgets/app.dart';
import 'widgets/expandable.dart';
import 'widgets/menu.dart';
import 'widgets/modal.dart';
import 'widgets/navigator.dart';
import 'widgets/positioned.dart';
import 'widgets/pressable.dart';
import 'widgets/radio_group.dart';
import 'widgets/scroll_view.dart';
import 'widgets/stack.dart';
import 'widgets/text.dart';
import 'widgets/text_input.dart';
import 'widgets/tooltip.dart';
import 'widgets/view.dart';

/// Registers all built-in Fuse widgets, handles and route types.
///
/// solid-fuse is the core package — `fuse link` sorts it first so its
/// registrations land before any third-party package's.
void registerSolidFuse(FuseRuntime runtime) {
  runtime.registerWidget('app', FuseApp.new);
  runtime.registerWidget('view', FuseViewWidget.new);
  runtime.registerWidget('text', FuseText.new);
  runtime.registerWidget('pressable', FusePressable.new);
  runtime.registerWidget('textInput', FuseTextInput.new);
  runtime.registerWidget('navigator', FuseNavigatorWidget.new);
  runtime.registerWidget('scrollView', FuseScrollView.new);
  runtime.registerWidget('stack', FuseStack.new);
  runtime.registerWidget('positioned', FusePositioned.new);
  runtime.registerWidget('modal', FuseModal.new, inFlow: false);
  runtime.registerWidget('radioGroup', FuseRadioGroup.new);
  runtime.registerWidget('tooltip', FuseTooltip.new);
  runtime.registerWidget('menu', FuseMenu.new);
  runtime.registerWidget('expandable', FuseExpandable.new);
  runtime.registerHandle('page', FusePage.new);
  runtime.registerRoute('dialog', fuseDialogRoute);
}
