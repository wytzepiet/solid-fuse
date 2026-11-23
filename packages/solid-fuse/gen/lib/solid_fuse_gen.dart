/// Reads Dart signatures and writes the solid-fuse bridge manifest.
library;

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;

import 'src/barrels.dart';
import 'src/config.dart';
import 'src/manifest.dart';
import 'src/world.dart';

export 'src/barrels.dart' show barrelLibraries;
export 'src/config.dart' show GenConfig, LibraryRule;
export 'src/manifest.dart' show generatorVersion, manifestFormat;
export 'src/world.dart' show World;

/// The generator's own build: its snapshot changes whenever its code does,
/// which a version number alone would miss during development.
String selfStamp() {
  final self = File.fromUri(Platform.script);
  final stamp = StringBuffer(self.existsSync() ? '${self.lengthSync()}:${self.lastModifiedSync().microsecondsSinceEpoch}' : '');
  // Run from source (`dart run` inside this package): the code is the
  // package's lib/ too.
  if (self.path.endsWith('.dart')) {
    final src = Directory(p.join(self.parent.parent.path, 'lib'));
    if (src.existsSync()) {
      final files = [for (final f in src.listSync(recursive: true)) if (f is File) f]..sort((a, b) => a.path.compareTo(b.path));
      for (final f in files) {
        final st = f.statSync();
        stamp.write(';${f.path}:${st.size}:${st.modified.microsecondsSinceEpoch}');
      }
    }
  }
  return stamp.toString();
}

/// Hash of everything the manifest depends on: the generator, the config, and
/// the resolved packages. Equal hash, equal manifest.
String inputHash({required String root, required String configJson}) {
  final stamp = selfStamp();
  final parts = <List<int>>[
    utf8.encode('$generatorVersion\n$manifestFormat\n$stamp\n'),
    utf8.encode(configJson),
  ];
  for (final f in ['.dart_tool/package_config.json', 'pubspec.lock']) {
    final file = File(p.join(root, f));
    parts.add(file.existsSync() ? file.readAsBytesSync() : const []);
  }
  // The app's own Dart (its barrel and what it exports): a stat per file is
  // enough to notice an edit.
  final lib = Directory(p.join(root, 'lib'));
  if (lib.existsSync()) {
    final files = [
      for (final f in lib.listSync(recursive: true))
        // What fuse gen and fuse link write is output, not input.
        if (f is File && f.path.endsWith('.dart') && !_generatedFile(f.path)) f,
    ]..sort((a, b) => a.path.compareTo(b.path));
    final stats = StringBuffer();
    for (final f in files) {
      final st = f.statSync();
      stats.write('${p.relative(f.path, from: root)}:${st.size}:${st.modified.microsecondsSinceEpoch}\n');
    }
    parts.add(utf8.encode(stats.toString()));
  }
  final b = BytesBuilder(copy: false);
  for (final x in parts) {
    b
      ..add(x)
      ..addByte(0);
  }
  return sha256.convert(b.takeBytes()).toString();
}

bool _generatedFile(String path) =>
    path.endsWith('.generated.dart') || path.endsWith('.g.dart') || path.endsWith('.freezed.dart') ||
    p.split(path).any((s) => s == 'generated' || s == '_generated');

/// Loads the libraries [config] names, and what the barrels export (the
/// app's and its packages' `lib/fuse.dart`), from the package at [root] and
/// builds the manifest.
Future<Map<String, Object?>> generate({
  required String root,
  required GenConfig config,
  String? cacheDir,
  String? sdkPath,
}) async {
  final barrels = barrelLibraries(root);
  var extra = <String>[];
  while (true) {
    final w = await World.load(
      root: root,
      targets: [...config.libraries.keys, ...barrels],
      extra: extra,
      cacheDir: cacheDir,
      sdkPath: sdkPath,
    );
    // The libraries the barrels' classes come through must be loaded to
    // read the rules; load them and start over.
    final b = readBarrels(w, barrels);
    final load = [for (final u in b.load) if (w.library(u) == null && !w.loadErrors.containsKey(u) && !extra.contains(u)) u];
    if (load.isNotEmpty) {
      extra = [...extra, ...load];
      continue;
    }
    final m = ManifestBuilder(w, config.merged(b.rules)).build();
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
