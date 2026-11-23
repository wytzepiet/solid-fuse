// dart run solid_fuse_gen --config gen.json --out fuse.manifest.json
//
// Exit codes: 0 written or up to date, 64 usage / config error, 70 the
// generator itself failed (never because of an item it could not bridge:
// those are listed in the manifest's `skipped`).
//
// With --serve it stays running: each line on stdin is one run (`{}`, or
// `{"force": true}`), answered by one JSON line on stdout. The analyzer keeps
// what it resolved between runs, so a run after an edit only re-reads the
// files that changed. It exits when stdin closes, and with 75 when its own
// code changed (start it again).
import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:solid_fuse_gen/solid_fuse_gen.dart';

const usage = '''
Usage: dart run solid_fuse_gen --config <file.json> --out <manifest.json> [options]

  --root <dir>     Flutter package to analyze (default: .)
  --cache <dir>    analyzer cache (default: <root>/.dart_tool/solid_fuse_gen)
  --force          regenerate even when the inputs are unchanged
  --serve          stay running, one run per line on stdin
  --sdk <dir>      Dart SDK (default: the running one)
''';

Future<void> main(List<String> args) async {
  String? configPath, out, cache, sdk;
  var root = '.';
  var force = false, serve = false;
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
        case '--serve':
          serve = true;
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

  final run = Run(root: root, configPath: configPath, out: out, cache: cache, sdk: sdk);
  if (!serve) {
    final r = await run.once(force: force);
    stderr.writeln(r.message);
    exit(r.code);
  }

  final self = selfStamp();
  await for (final line in stdin.transform(utf8.decoder).transform(const LineSplitter())) {
    if (line.trim().isEmpty) continue;
    if (selfStamp() != self) {
      stdout.writeln(jsonEncode({'code': 75, 'message': 'solid_fuse_gen changed; start it again'}));
      await stdout.flush();
      exit(75);
    }
    Object? req;
    try {
      req = jsonDecode(line);
    } on FormatException {
      stdout.writeln(jsonEncode({'code': 64, 'message': 'not a JSON request: $line'}));
      continue;
    }
    final r = await run.once(force: req is Map && req['force'] == true);
    stdout.writeln(jsonEncode({'code': r.code, 'message': r.message}));
  }
}

class Result {
  Result(this.code, this.message);
  final int code;
  final String message;
}

class Run {
  Run({required this.root, required this.configPath, required this.out, this.cache, this.sdk});
  final String root, configPath, out;
  final String? cache, sdk;

  /// What the analyzer last read: Dart file under lib/ -> its stat, plus the
  /// resolved packages.
  Map<String, String>? _seen;

  Future<Result> once({bool force = false}) async {
    final sw = Stopwatch()..start();
    final configJson = File(configPath).readAsStringSync();
    final GenConfig config;
    try {
      config = GenConfig.fromJson(jsonDecode(configJson));
    } on FormatException catch (e) {
      return Result(64, '$configPath: ${e.message}');
    }
    final hash = inputHash(root: root, configJson: configJson);
    final outFile = File(out);
    if (!force && outFile.existsSync()) {
      try {
        final old = jsonDecode(outFile.readAsStringSync());
        if (old is Map && old['inputHash'] == hash) {
          return Result(0, 'solid_fuse_gen: up to date (${sw.elapsedMilliseconds} ms)');
        }
      } on FormatException {
        // unreadable manifest: regenerate
      }
    }

    try {
      await _refresh();
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
      return Result(
          0,
          'solid_fuse_gen: $widgets widgets, ${(manifest['handles']! as List).length} handles, '
          '${(manifest['types']! as Map).length} types, $skipped skipped (${sw.elapsedMilliseconds} ms)');
    } catch (e, st) {
      return Result(70, 'solid_fuse_gen failed: $e\n$st');
    }
  }

  /// Tells a kept analyzer what changed on disk since the last run: the
  /// files under lib/ that changed, or everything when the resolved packages
  /// did.
  Future<void> _refresh() async {
    final now = <String, String>{};
    String stat(File f) => f.existsSync() ? '${f.lengthSync()}:${f.lastModifiedSync().microsecondsSinceEpoch}' : '';
    for (final f in ['.dart_tool/package_config.json', 'pubspec.lock']) {
      now[f] = stat(File(p.join(root, f)));
    }
    final lib = Directory(p.join(root, 'lib'));
    if (lib.existsSync()) {
      for (final f in lib.listSync(recursive: true)) {
        if (f is File && f.path.endsWith('.dart')) now[f.absolute.path] = stat(f);
      }
    }
    final seen = _seen;
    _seen = now;
    if (seen == null) return;
    if (now['.dart_tool/package_config.json'] != seen['.dart_tool/package_config.json'] ||
        now['pubspec.lock'] != seen['pubspec.lock']) {
      await World.reset(root);
      return;
    }
    final changed = {
      for (final e in now.entries)
        if (seen[e.key] != e.value) e.key,
      for (final k in seen.keys)
        if (!now.containsKey(k)) k,
    };
    if (changed.isNotEmpty) await World.changed(root, changed);
  }
}
