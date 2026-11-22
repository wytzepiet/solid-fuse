// dart run solid_fuse_gen --config gen.json --out fuse.manifest.json
//
// Exit codes: 0 written or up to date, 64 usage / config error, 70 the
// generator itself failed (never because of an item it could not bridge:
// those are listed in the manifest's `skipped`).
import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:solid_fuse_gen/solid_fuse_gen.dart';

const usage = '''
Usage: dart run solid_fuse_gen --config <file.json> --out <manifest.json> [options]

  --root <dir>     Flutter package to analyze (default: .)
  --cache <dir>    analyzer cache (default: <root>/.dart_tool/solid_fuse_gen)
  --force          regenerate even when the inputs are unchanged
  --sdk <dir>      Dart SDK (default: the running one)
''';

Future<void> main(List<String> args) async {
  String? configPath, out, cache, sdk;
  var root = '.';
  var force = false;
  try {
    for (var i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--config':
          configPath = args[++i];
        case '--out':
          out = args[++i];
        case '--root':
          root = args[++i];
        case '--cache':
          cache = args[++i];
        case '--sdk':
          sdk = args[++i];
        case '--force':
          force = true;
        case '-h' || '--help':
          stdout.write(usage);
          return;
        default:
          throw FormatException('unknown argument ${args[i]}');
      }
    }
    if (configPath == null || out == null) throw const FormatException('--config and --out are required');
  } on Object catch (e) {
    stderr
      ..writeln(e is FormatException ? e.message : '$e')
      ..write(usage);
    exit(64);
  }

  final sw = Stopwatch()..start();
  final configJson = File(configPath).readAsStringSync();
  final GenConfig config;
  try {
    config = GenConfig.fromJson(jsonDecode(configJson));
  } on FormatException catch (e) {
    stderr.writeln('$configPath: ${e.message}');
    exit(64);
  }
  final hash = inputHash(root: root, configJson: configJson);
  final outFile = File(out);
  if (!force && outFile.existsSync()) {
    try {
      final old = jsonDecode(outFile.readAsStringSync());
      if (old is Map && old['inputHash'] == hash) {
        stderr.writeln('solid_fuse_gen: up to date (${sw.elapsedMilliseconds} ms)');
        return;
      }
    } on FormatException {
      // unreadable manifest: regenerate
    }
  }

  try {
    final manifest = await generate(
      root: root,
      config: config,
      cacheDir: cache ?? p.join(root, '.dart_tool', 'solid_fuse_gen', 'cache'),
      sdkPath: sdk,
    );
    manifest['inputHash'] = hash;
    outFile.parent.createSync(recursive: true);
    final tmp = File('${outFile.path}.tmp');
    tmp.writeAsStringSync(const JsonEncoder.withIndent(' ').convert(manifest));
    tmp.renameSync(outFile.path);
    final widgets = (manifest['widgets']! as List).length;
    final skipped = (manifest['skipped']! as List).length;
    stderr.writeln('solid_fuse_gen: $widgets widgets, ${(manifest['handles']! as List).length} handles, '
        '${(manifest['types']! as Map).length} types, $skipped skipped (${sw.elapsedMilliseconds} ms)');
  } catch (e, st) {
    stderr.writeln('solid_fuse_gen failed: $e\n$st');
    exit(70);
  }
}
