import 'package:flutter/widgets.dart';

import '../node.dart';
import '../runtime.dart';

/// `<app>`: the root of a design-free app. A [WidgetsApp] whose home is the
/// node's children, so there is a root Navigator (dialogs, sheets) and an
/// Overlay (tooltips, menus) without a design library.
class FuseApp extends StatelessWidget {
  const FuseApp(this.node, {super.key});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final text = node.map('textStyle');
    return WidgetsApp(
      title: node.string('title') ?? '',
      color: node.color('color') ?? const Color(0xFF2196F3),
      locale: fuseLocale(node.string('locale')),
      debugShowCheckedModeBanner: false,
      textStyle: TextStyle(
        fontFamily: text?.string('fontFamily'),
        fontSize: text?.double('fontSize') ?? 14,
        color: text?.color('color') ?? const Color(0xFF000000),
      ),
      pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) =>
          PageRouteBuilder<T>(settings: settings, pageBuilder: (context, _, _) => builder(context)),
      home: FuseAppContent(node),
    );
  }
}

/// The children of an app root node, rebuilt when they change. Design
/// packages' app roots use it as their `home`.
class FuseAppContent extends StatelessWidget {
  const FuseAppContent(this.node, {super.key});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    // The app's Navigator is above the runtime scope when the app root sits
    // inside FuseView; routes pushed on it still need the runtime.
    final runtime = FuseRuntimeScope.of(context);
    return FuseRuntimeScope(
      runtime: runtime,
      child: ListenableBuilder(listenable: node, builder: (_, _) => node.flexChildren),
    );
  }
}

/// `"en-US"` / `"nl"` as a [Locale].
Locale? fuseLocale(String? tag) {
  if (tag == null || tag.isEmpty) return null;
  final parts = tag.split(RegExp('[-_]'));
  return Locale(parts[0], parts.length > 1 ? parts[1] : null);
}
