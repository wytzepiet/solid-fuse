// Generator entry point behind `fuse gen` / `fuse add`.
//
//   dart run bin/fuse_gen.dart --job job.json
//
// job.json:
//   {
//     "appRoot": "/abs/app/dart",          // analysis context: the app's package_config decides versions
//     "outDart": "/abs/app/dart/lib/_generated",
//     "outManifest": "/abs/app/src/_generated",
//     "docs": "first",                      // none | first | full
//     "units": [
//       { "name": "flutter", "widgets": ["ListTile", "Image.network"] },
//       { "name": "percent_indicator",
//         "libs": [["package:percent_indicator/percent_indicator.dart", "percent_indicator"]],
//         "include": null },                // null = every widget the libs export
//       { "name": "app", "libs": [["package:my_app/fuse/badge.dart", "app_badge"]] }
//     ]
//   }
//
// Writes <outDart>/<unit>.fuse.g.dart and <outManifest>/<unit>.manifest.json,
// and prints one JSON summary line on stdout.
import 'dart:convert';
import 'dart:io';

import 'package:fuse_gen/src/classify.dart';
import 'package:fuse_gen/src/gen.dart';
import 'package:fuse_gen/src/overrides.dart';
import 'package:fuse_gen/src/world.dart';

/// Bumped whenever generated output changes shape. Recorded in fuse.lock.
const generatorVersion = '0.1.0';

Future<void> main(List<String> args) async {
  final i = args.indexOf('--job');
  if (i < 0 || i + 1 >= args.length) {
    stderr.writeln('usage: fuse_gen --job <job.json>');
    exit(64);
  }
  final job = jsonDecode(File(args[i + 1]).readAsStringSync()) as Map<String, dynamic>;
  final appRoot = job['appRoot'] as String;
  final outDart = job['outDart'] as String;
  final outManifest = job['outManifest'] as String;
  final docs = job['docs'] as String? ?? 'first';
  final units = (job['units'] as List).cast<Map<String, dynamic>>();

  final sw = Stopwatch()..start();
  final extra = <(String, String)>[
    for (final u in units)
      for (final l in (u['libs'] as List? ?? const [])) ((l as List)[0] as String, l[1] as String),
  ];
  final w = await World.load(appRoot, extraLibs: extra);
  final loadMs = sw.elapsedMilliseconds;
  Directory(outDart).createSync(recursive: true);
  Directory(outManifest).createSync(recursive: true);

  final summary = <String, Object?>{'generator': generatorVersion, 'loadMs': loadMs, 'units': <String, Object?>{}};
  for (final u in units) {
    final name = u['name'] as String;
    final usw = Stopwatch()..start(); // report 09: per-unit timing
    try {
    final libs = [for (final l in (u['libs'] as List? ?? const [])) (l as List)[0] as String];
    final include = (u['include'] as List?)?.cast<String>();
    // One classifier per unit keeps a unit's output independent of the order
    // units are generated in.
    final c = Classifier(w, codecTypes: {for (final o in defaultOverrides) o.type});
    final g = Generator(w, c, docs: docs, unit: name);
    if (libs.isEmpty) {
      for (final spec in (u['widgets'] as List? ?? const []).cast<String>()) {
        g.addWidget(spec);
      }
    } else {
      for (final lib in libs) {
        final pkgPrefix = lib.substring(0, lib.indexOf('/'));
        final classes = w.widgetsOf(lib)..sort((a, b) => a.name!.compareTo(b.name!));
        for (final k in classes) {
          // only classes declared by that package (not Flutter re-exports)
          if (!k.library.uri.toString().startsWith(pkgPrefix)) continue;
          for (final ctor in k.constructors.where((x) => x.isPublic && !x.metadata.hasDeprecated && (!k.isAbstract || x.isFactory))) {
            final spec = (ctor.name == null || ctor.name == 'new') ? k.name! : '${k.name}.${ctor.name}';
            if (include != null && !include.contains(spec) && !include.contains(k.name)) continue;
            g.addWidget(spec, libUri: lib);
          }
        }
      }
    }
    final out = g.finish();
    final manifest = <String, Object?>{
      'manifestVersion': 1,
      'generator': generatorVersion,
      'unit': name,
      'version': u['version'] ?? 'unknown',
      ...out.manifest,
      if (libs.isNotEmpty) 'libraries': libs,
    };
    File('$outDart/$name.fuse.g.dart').writeAsStringSync(out.dart);
    File('$outManifest/$name.manifest.json').writeAsStringSync('${prettyManifest(manifest)}\n');
    final ok = g.reports.where((r) => r.skipped == null).toList();
    (summary['units'] as Map)[name] = {
      'widgetsRequested': g.reports.length,
      'widgetsEmitted': ok.length,
      'paramsTotal': ok.fold<int>(0, (a, r) => a + r.params),
      'paramsEmitted': ok.fold<int>(0, (a, r) => a + r.emitted),
      'dartBytes': out.dart.length,
      'dartLines': '\n'.allMatches(out.dart).length,
      'dartAdapterLines': ok.fold<int>(0, (a, r) => a + r.dartLines),
      'dartCodecLines': out.codecLines,
      'decoders': g.decoderCount,
      'encoders': g.encoderCount,
      'enums': g.enumCount,
      'skipped': {for (final r in g.reports.where((r) => r.skipped != null)) r.component: r.skipped},
      'warnings': g.warnings.toSet().toList(),
      'ms': usw.elapsedMilliseconds,
    };
    stderr.writeln('[fuse gen] $name: ${ok.length}/${g.reports.length} widgets, '
        '${ok.fold<int>(0, (a, r) => a + r.emitted)}/${ok.fold<int>(0, (a, r) => a + r.params)} params, '
        '${'\n'.allMatches(out.dart).length} lines Dart');
    } catch (e, st) {
      // report 09: one unit crashing must not sink the batch
      (summary['units'] as Map)[name] = {'crash': '$e', 'stack': '$st'.split('\n').take(6).join(' | '), 'ms': usw.elapsedMilliseconds};
      stderr.writeln('[fuse gen] $name: CRASH $e');
    }
  }
  summary['totalMs'] = sw.elapsedMilliseconds;
  stdout.writeln(jsonEncode(summary));
}

/// Pretty-prints the manifest so that it diffs well when committed: one line
/// per prop, per data-type variant and per payload field (depth 4), with the
/// structure above that indented normally.
String prettyManifest(Object? v, [int depth = 0]) {
  final pad = ' ' * depth;
  if (v is Map && v.isNotEmpty && depth < 4) {
    final b = StringBuffer('{\n');
    final keys = v.keys.toList();
    for (var i = 0; i < keys.length; i++) {
      b.write('$pad ${jsonEncode(keys[i])}: ${prettyManifest(v[keys[i]], depth + 1)}');
      b.write(i == keys.length - 1 ? '\n' : ',\n');
    }
    b.write('$pad}');
    return b.toString();
  }
  if (v is List && v.isNotEmpty && depth < 4 && v.any((e) => e is Map || e is List)) {
    final b = StringBuffer('[\n');
    for (var i = 0; i < v.length; i++) {
      b.write('$pad ${prettyManifest(v[i], depth + 1)}');
      b.write(i == v.length - 1 ? '\n' : ',\n');
    }
    b.write('$pad]');
    return b.toString();
  }
  return jsonEncode(v);
}
