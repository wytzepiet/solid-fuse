import 'dart:io';

// ExternalLibrary is exposed via the "for_generated" barrel (the same one the
// frb-generated code imports), not the public one.
// ignore: invalid_use_of_internal_member
import 'package:flutter_rust_bridge/flutter_rust_bridge_for_generated.dart'
    show ExternalLibrary;

import 'package:solid_fuse/fjs.dart' show LibFjs;

bool _started = false;

/// Loads the vendored fjs Rust library, picking the right strategy for how
/// solid_fuse links it on each platform. Idempotent — safe to call repeatedly.
///
/// On iOS/macOS the static lib (`libfjs.a`) is force-loaded into
/// `solid_fuse.framework`, so its symbols live in the running process. We point
/// frb at the process rather than the `fjs.framework` its generated loader
/// assumes (that framework no longer exists now that fjs is vendored into
/// solid_fuse). Elsewhere cargokit bundles a dynamic `libfjs.{so,dll}` that
/// frb's default loader opens by name.
Future<void> initFjs() async {
  if (_started) return;
  _started = true;
  final externalLibrary = (Platform.isIOS || Platform.isMacOS)
      ? ExternalLibrary.process(iKnowHowToUseIt: true)
      : null;
  await LibFjs.init(externalLibrary: externalLibrary);
}
