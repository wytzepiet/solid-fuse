/// Reads Dart signatures and writes the solid-fuse bridge manifest.
library;

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;

import 'src/config.dart';
import 'src/manifest.dart';
import 'src/world.dart';

export 'src/config.dart' show GenConfig, LibraryRule;
export 'src/manifest.dart' show generatorVersion, manifestFormat;

/// Hash of everything the manifest depends on: the generator, the config, and
/// the resolved packages. Equal hash, equal manifest.
String inputHash({required String root, required String configJson}) {
  final parts = <List<int>>[
    utf8.encode('$generatorVersion\n$manifestFormat\n'),
    utf8.encode(configJson),
  ];
  for (final f in ['.dart_tool/package_config.json', 'pubspec.lock']) {
    final file = File(p.join(root, f));
    parts.add(file.existsSync() ? file.readAsBytesSync() : const []);
  }
  final b = BytesBuilder(copy: false);
  for (final x in parts) {
    b
      ..add(x)
      ..addByte(0);
  }
  return sha256.convert(b.takeBytes()).toString();
}

/// Loads the libraries [config] names from the package at [root] and builds
/// the manifest.
Future<Map<String, Object?>> generate({
  required String root,
  required GenConfig config,
  String? cacheDir,
  String? sdkPath,
  int maxConsts = 400,
}) async {
  var extra = <String>[];
  while (true) {
    final w = await World.load(
      root: root,
      targets: config.libraries.keys.toList(),
      extra: extra,
      cacheDir: cacheDir,
      sdkPath: sdkPath,
    );
    final m = ManifestBuilder(w, config, maxConsts: maxConsts).build();
    // A type from a package nothing exported (flutter_map's LatLng is
    // latlong2's): load that package's public libraries and build again.
    // Each round adds libraries it never adds again, so this ends.
    final more = [
      // Flutter's own libraries are in [supportLibraries] already; its others
      // (material.dart, cupertino.dart) are deprecated copies.
      for (final pkg in w.missedPackages.difference(const {'flutter', 'flutter_test', 'flutter_driver'}))
        for (final uri in w.publicLibrariesOf(pkg))
          if (!extra.contains(uri) && w.library(uri) == null && !w.loadErrors.containsKey(uri)) uri,
    ];
    if (more.isEmpty) return m;
    extra = [...extra, ...more];
  }
}
