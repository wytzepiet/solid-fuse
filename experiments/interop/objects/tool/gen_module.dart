// Part 4: generate a typed async TS module + one Dart channel handler from a
// pub package's public non-widget API ("fuse add <package>", non-UI half).
//
//   dart run tool/gen_module.dart --name url_launcher --lib package:url_launcher/url_launcher.dart=url_launcher
//   [--also package:x/y.dart=prefix]   extra libraries whose types may be referenced
//   [--decl file.json]                 per-class overrides, same format as fuse.objects.json "objects"
//
// Output: lib/generated/<name>.g.dart, ts/generated/<name>.ts, out/<name>.report.json
import 'dart:convert';
import 'dart:io';

import 'src/classify.dart';
import 'src/gen.dart';
import 'src/objects.dart';
import 'src/overrides.dart';
import 'src/world.dart';

Future<void> main(List<String> args) async {
  String? name;
  final libs = <(String, String)>[];
  final also = <(String, String)>[];
  Map<String, dynamic> decls = {};
  var docs = 'first';
  for (var i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name':
        name = args[++i];
      case '--lib':
        final p = args[++i].split('=');
        libs.add((p[0], p[1]));
      case '--also':
        final p = args[++i].split('=');
        also.add((p[0], p[1]));
      case '--decl':
        decls = (jsonDecode(File(args[++i]).readAsStringSync()) as Map<String, dynamic>)['objects'] as Map<String, dynamic>? ?? {};
      case '--docs':
        docs = args[++i];
    }
  }
  name ??= libs.first.$2;
  final sw = Stopwatch()..start();
  final w = await World.load('.', extraLibs: [...libs, ...also]);
  final c = Classifier(w,
      codecTypes: {for (final o in defaultOverrides) o.type},
      encTypes: {for (final o in defaultOverrides) if (o.encode != null) o.type});
  final g = Generator(w, c, docs: docs, tagPrefix: '${name}_');
  final entryLibs = [for (final l in libs) w.entries.firstWhere((e) => e.uri == l.$1).element];
  // Pass 1: which exported classes are objects. A class that is neither a
  // record nor structurally an object (no Listenable, no dispose) but has
  // behaviour falls back to "opaque object", as flutter_rust_bridge does.
  final om0 = ObjectModeler(w, c);
  final probe = ModuleEmitter(g, om0, ObjectEmitter(g, om0), name);
  final objectTypes = [for (final l in entryLibs) ...probe.collectObjects(l)];
  // Pass 2: model everything again knowing those names are objects.
  final om = ObjectModeler(w, c, objectNames: {for (final t in objectTypes) t.element.name!});
  final oe = ObjectEmitter(g, om, tagPrefix: '${name}_');
  final me = ModuleEmitter(g, om, oe, name);
  me.skipped.addAll(probe.skipped);
  final seen = <Object>{};
  objectTypes.retainWhere((t) => seen.add(t.element));
  for (final t in objectTypes) {
    oe.declare(t.element);
  }
  for (final t in objectTypes) {
    final n = t.element.name!;
    oe.emit(t, ObjDecl.fromJson(n, (decls[n] as Map?)?.cast<String, dynamic>() ?? {}));
  }
  for (final l in entryLibs) {
    me.addLibrary(l);
  }
  final out = g.finishObjects(name, objects: oe, module: me, package: 'fuse_objects_spike');
  File('lib/generated/$name.g.dart').writeAsStringSync(out.dart);
  File('ts/generated/$name.ts').writeAsStringSync(out.ts);

  // ── coverage over the public callable surface ───────────────────────────
  final rows = [...me.surface];
  for (final r in oe.reports) {
    final cls = r['class'];
    for (final k in r['ctors'] as List) {
      rows.add({'kind': 'constructor', 'name': '$cls.$k', 'ok': true});
    }
    for (final m in r['methods'] as List) {
      rows.add({'kind': 'method', 'name': '$cls#$m', 'ok': true});
    }
    for (final m in r['streams'] as List) {
      rows.add({'kind': 'stream', 'name': '$cls#$m', 'ok': true});
    }
    for (final m in r['readable'] as List) {
      rows.add({'kind': 'getter', 'name': '$cls#$m', 'ok': true});
    }
    for (final m in r['objectGetters'] as List) {
      rows.add({'kind': 'getter', 'name': '$cls#$m', 'ok': true});
    }
    for (final m in r['setters'] as List) {
      rows.add({'kind': 'setter', 'name': '$cls#$m', 'ok': true});
    }
    (r['dropped'] as Map).forEach((k, why) {
      final key = k as String;
      // a dropped *optional parameter* of an emitted method is not a lost member
      if (RegExp(r'\(.+\)$').hasMatch(key)) return;
      rows.add({
        'kind': key.startsWith('constructor') ? 'constructor' : key.endsWith('()') ? 'method' : key.endsWith('=') ? 'setter' : 'getter',
        'name': '$cls#$key',
        'ok': false,
        'why': why,
      });
    });
  }
  final byKind = <String, List<int>>{};
  for (final r in rows) {
    final k = byKind[r['kind'] as String] ??= [0, 0];
    k[1]++;
    if (r['ok'] == true) k[0]++;
  }
  final ok = rows.where((r) => r['ok'] == true).length;
  final report = {
    'name': name,
    'libs': [for (final l in libs) l.$1],
    'surface': {'total': rows.length, 'bridged': ok, 'byKind': {for (final e in byKind.entries) e.key: {'bridged': e.value[0], 'total': e.value[1]}}},
    'notBridged': [for (final r in rows) if (r['ok'] != true) r],
    'partial': [for (final r in rows) if (r['ok'] == true && r['why'] != null) r],
    'objects': oe.reports,
    'notCallable': me.skipped,
    'dartLines': '\n'.allMatches(out.dart).length,
    'tsLines': '\n'.allMatches(out.ts).length,
    'warnings': g.warnings.toSet().toList(),
  };
  File('out/$name.report.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(report));
  stderr.writeln('$name: $ok/${rows.length} public callable members bridged '
      '(${byKind.entries.map((e) => '${e.key} ${e.value[0]}/${e.value[1]}').join(', ')}); '
      '${oe.reports.length} objects; ${report['dartLines']} lines Dart, ${report['tsLines']} lines TS; ${sw.elapsedMilliseconds}ms');
  for (final r in rows.where((r) => r['ok'] != true)) {
    stderr.writeln('  NOT BRIDGED ${r['kind']} ${r['name']}: ${r['why']}');
  }
}
