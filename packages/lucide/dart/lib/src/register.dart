import 'package:solid_fuse/solid_fuse.dart';

/// Lucide ships as a font, not a handle or widget, so there is nothing to
/// register on the runtime. The package exists purely so `fuse link` adds it
/// to the consumer's `pubspec.yaml` — that pulls in `flutter_lucide`, whose
/// `lucide` font then gets bundled into the app. The JS `@solid-fuse/lucide`
/// exports are plain `IconData` values rendered by the core `Icon` widget.
void register(FuseRuntime runtime) {}
