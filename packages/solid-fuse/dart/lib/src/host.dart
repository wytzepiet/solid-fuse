import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'channels.dart';

/// What every connection sets up around its JS, whatever runs it: the
/// channels JS needs from the host (`_log`, `_navSave`), the facts JS reads
/// as `globalThis.__fuseHost` (src/host.ts), and the observer that keeps
/// them current. The connection puts [host] in place before the bundle runs,
/// and removes [observer] from the binding when it retires.
Future<({Map<String, Object?> host, WidgetsBindingObserver observer})> setUpHost(FuseChannels channels) async {
  channels.on('_log', (data) => debugPrint('[Fuse JS] ${data['message']}'));

  // The app's navigation, saved for when the OS kills the app in the
  // background and starts it again (src/navigation-controller.ts).
  final restoration = await _restorationBucket();
  channels.on('_navSave', (data) => restoration?.write<String>(_navKey, data['stack'] as String));

  final mode = kReleaseMode
      ? 'release'
      : kProfileMode
          ? 'profile'
          : 'debug';

  // Forward OS light/dark and view changes to JS so host's accessors stay
  // reactive.
  final observer = _FuseHostObserver(channels);
  WidgetsBinding.instance.addObserver(observer);

  // Sourced from foundation/dart:ui only, never Material/Cupertino.
  return (
    host: <String, Object?>{
      'mode': mode,
      'platform': _fusePlatformName(),
      'brightness': _fuseBrightnessName(),
      'view': fuseViewMetrics(),
      // The link the app was opened with; the app's routes open it.
      'link': WidgetsBinding.instance.platformDispatcher.defaultRouteName,
      // Whether the OS keeps the navigation, and what it kept.
      'restoration': restoration != null,
      'restore': restoration?.read<String>(_navKey),
    },
    observer: observer,
  );
}

// --- `host` namespace: ambient platform/brightness facts ---
// Read-only facts sourced from foundation/dart:ui (never Material/Cupertino),
// surfaced to JS via the `host` object in src/host.ts.

String _fusePlatformName() {
  if (kIsWeb) return 'web';
  return switch (defaultTargetPlatform) {
    TargetPlatform.android => 'android',
    TargetPlatform.iOS => 'ios',
    TargetPlatform.macOS => 'macos',
    TargetPlatform.windows => 'windows',
    TargetPlatform.linux => 'linux',
    TargetPlatform.fuchsia => 'fuchsia',
  };
}

String _fuseBrightnessName() =>
    WidgetsBinding.instance.platformDispatcher.platformBrightness ==
            Brightness.dark
        ? 'dark'
        : 'light';

/// The app's view as `host` reports it (src/host.ts), in logical pixels: what
/// `MediaQuery` would say at the root. The implicit view, or the first.
@visibleForTesting
Map<String, Object?> fuseViewMetrics() {
  final dispatcher = WidgetsBinding.instance.platformDispatcher;
  final view = dispatcher.implicitView ?? dispatcher.views.firstOrNull;
  if (view == null) return const {};
  final data = MediaQueryData.fromView(view);
  Map<String, double> insets(EdgeInsets e) => {'left': e.left, 'top': e.top, 'right': e.right, 'bottom': e.bottom};
  return {
    'size': {'width': data.size.width, 'height': data.size.height},
    'devicePixelRatio': data.devicePixelRatio,
    'padding': insets(data.padding),
    'viewInsets': insets(data.viewInsets),
    'viewPadding': insets(data.viewPadding),
    'textScale': data.textScaler.scale(1),
  };
}

const _navKey = 'fuse.navigation';

/// The OS's restoration data: Android, and iOS when the runner gives the
/// Flutter view controller a restoration id. Other platforms don't answer
/// Flutter's restoration channel at all, so they aren't asked.
Future<RestorationBucket?> _restorationBucket() async {
  if (kIsWeb) return null;
  if (defaultTargetPlatform != TargetPlatform.android && defaultTargetPlatform != TargetPlatform.iOS) return null;
  try {
    return await ServicesBinding.instance.restorationManager.rootBucket
        .timeout(const Duration(seconds: 2), onTimeout: () => null);
  } catch (_) {
    return null;
  }
}

/// Forwards OS light/dark and view changes (size, insets, text scale) to its
/// connection's channels so `host`'s accessors stay reactive. One per
/// connection; [setUpHost] adds it, the connection removes it.
class _FuseHostObserver with WidgetsBindingObserver {
  _FuseHostObserver(this._channels);

  final FuseChannels _channels;

  @override
  void didChangePlatformBrightness() => _channels
      .send('_brightness', <String, dynamic>{'value': _fuseBrightnessName()});

  @override
  void didChangeMetrics() => _channels.send('_view', fuseViewMetrics());

  @override
  void didChangeTextScaleFactor() => _channels.send('_view', fuseViewMetrics());

  // Links the OS opens while the app runs go to the app's routes. Handled
  // here, so the app root's own Navigator doesn't try them as route names.
  @override
  Future<bool> didPushRouteInformation(RouteInformation routeInformation) async {
    _channels.send('_link', <String, dynamic>{'link': routeInformation.uri.toString()});
    return true;
  }
}
