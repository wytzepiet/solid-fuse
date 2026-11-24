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
    return WidgetsApp(
      title: node.string('title') ?? '',
      color: node.value<Color>('color') ?? const Color(0xFF2196F3),
      locale: fuseLocale(node.string('locale')),
      debugShowCheckedModeBanner: false,
      textStyle: const TextStyle(fontSize: 14, color: Color(0xFF000000)).merge(node.value<TextStyle>('textStyle')),
      pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) =>
          PageRouteBuilder<T>(settings: settings, pageBuilder: (context, _, _) => builder(context)),
      // The OS link goes to the app's routes (`_link`), not to this Navigator.
      initialRoute: '/',
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
      child: ListenableBuilder(listenable: node, builder: (_, _) => node.layoutChildren),
    );
  }
}

/// `"en-US"` / `"nl"` as a [Locale].
Locale? fuseLocale(String? tag) {
  if (tag == null || tag.isEmpty) return null;
  final parts = tag.split(RegExp('[-_]'));
  return Locale(parts[0], parts.length > 1 ? parts[1] : null);
}
