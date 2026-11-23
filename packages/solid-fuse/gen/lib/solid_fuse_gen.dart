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
  // The generator's own build: its snapshot changes whenever its code does,
  // which a version number alone would miss during development.
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
  final parts = <List<int>>[
    utf8.encode('$generatorVersion\n$manifestFormat\n$stamp\n'),
    utf8.encode(configJson),
  ];
  for (final f in ['.dart_tool/package_config.json', 'pubspec.lock']) {
    final file = File(p.join(root, f));
    parts.add(file.existsSync() ? file.readAsBytesSync() : const []);
  }
  // The app's own Dart (its `@fuse` code, a target library of its own): a
  // stat per file is enough to notice an edit.
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

/// Libraries read for annotations: the app's own `lib/` files that mention
/// `@fuse` / `@Fuse` (a text check, so nothing else is resolved), and
/// solid_fuse's shorthands when the app depends on solid_fuse.
List<String> annotatedLibraries(String root) {
  final out = <String>[];
  final pubspec = File(p.join(root, 'pubspec.yaml'));
  final name = pubspec.existsSync() ? RegExp(r'^name:\s*(\S+)', multiLine: true).firstMatch(pubspec.readAsStringSync())?.group(1) : null;
  final lib = Directory(p.join(root, 'lib'));
  if (name != null && lib.existsSync()) {
    final files = [
      for (final f in lib.listSync(recursive: true))
        if (f is File && f.path.endsWith('.dart') && !_generatedFile(f.path)) f,
    ]..sort((a, b) => a.path.compareTo(b.path));
    final mark = RegExp(r'@(fuse|Fuse|fuseShorthand|FuseShorthand)\b');
    for (final f in files) {
      if (!mark.hasMatch(f.readAsStringSync())) continue;
      out.add('package:$name/${p.posix.joinAll(p.split(p.relative(f.path, from: lib.path)))}');
    }
  }
  final packages = File(p.join(root, '.dart_tool', 'package_config.json'));
  if (packages.existsSync() && packages.readAsStringSync().contains('"name": "solid_fuse"')) {
    out.add('package:solid_fuse/shorthands.dart');
  }
  return out;
}

bool _generatedFile(String path) =>
    path.endsWith('.generated.dart') || path.endsWith('.g.dart') || path.endsWith('.freezed.dart') ||
    p.split(path).any((s) => s == 'generated' || s == '_generated');

/// Loads the libraries [config] names from the package at [root] and builds
/// the manifest.
Future<Map<String, Object?>> generate({
  required String root,
  required GenConfig config,
  String? cacheDir,
  String? sdkPath,
  int maxConsts = 400,
}) async {
  config = config.withAnnotated(annotatedLibraries(root));
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
