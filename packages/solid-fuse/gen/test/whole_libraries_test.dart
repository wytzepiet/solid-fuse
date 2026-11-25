// Everything in widgets, material_ui and cupertino_ui: the generator never
// fails on an item, and every ref in the manifest resolves.
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:solid_fuse_gen/solid_fuse_gen.dart';
import 'package:test/test.dart';

typedef Json = Map<String, Object?>;

final fixture = p.join('test', 'fixtures', 'app');

/// Problems with [m]: refs to missing types, input refs to types that cannot
/// be built, internal errors.
List<String> validate(Json m) {
  final types = (m['types']! as Map).cast<String, Json>();
  final out = <String>[];

  void ref(Object? r, String where, {required bool input}) {
    if (r is! Map) return;
    switch (r['k']) {
      case 'data' || 'enum' || 'handle':
        final t = types[r['id']];
        if (t == null) {
          out.add('$where: missing type ${r['id']}');
        } else if (t['kind'] != r['k']) {
          out.add('$where: ${r['id']} is ${t['kind']}, ref says ${r['k']}');
        } else if (r['k'] == 'data' && input && t['variants'] == null) {
          out.add('$where: ${r['id']} has no input side (${t['inputSkipped']})');
        } else if (r['k'] == 'data' && !input && t['fields'] == null) {
          out.add('$where: ${r['id']} has no output side');
        }
      case 'list' || 'set' || 'iterable':
        ref(r['of'], where, input: input);
      case 'map':
        ref(r['key'], where, input: input);
        ref(r['of'], where, input: input);
      case 'fn':
        for (final a in (r['args']! as List).cast<Json>()) {
          ref(a['type'], '$where(${a['name']})', input: false);
        }
        ref(r['ret'], '$where:return', input: true);
    }
  }

  void params(Object? ps, String where) {
    for (final pj in (ps! as List).cast<Json>()) {
      if (pj.containsKey('type') == pj.containsKey('skip')) out.add('$where.${pj['name']}: needs exactly one of type/skip');
      if (pj.containsKey('type') && pj['dart'] == null) out.add('$where.${pj['name']}: no Dart type');
      ref(pj['type'], '$where.${pj['name']}', input: true);
    }
  }

  for (final w in (m['widgets']! as List).cast<Json>()) {
    params(w['params'], w['id']! as String);
  }
  types.forEach((id, t) {
    for (final v in (t['variants'] as List? ?? const []).cast<Json>()) {
      params(v['params'], '$id(${v['tag']})');
    }
    for (final c in (t['ctors'] as List? ?? const []).cast<Json>()) {
      params(c['params'], '$id(${c['name']})');
    }
    for (final f in (t['fields'] as List? ?? const []).cast<Json>()) {
      ref(f['type'], '$id.${f['name']}', input: false);
    }
  });
  for (final s in (m['skipped']! as List).cast<Json>()) {
    if ((s['reason']! as String).startsWith('internal error')) out.add('${s['item']}: ${s['reason']}');
  }
  return out;
}

void main() {
  late Json m;
  setUpAll(() async {
    if (!File(p.join(fixture, '.dart_tool', 'package_config.json')).existsSync()) {
      final r = await Process.run('flutter', ['pub', 'get'], workingDirectory: fixture);
      if (r.exitCode != 0) throw StateError('flutter pub get failed: ${r.stderr}');
    }
    m = await generate(
      root: fixture,
      config: GenConfig.fromJson({
        'libraries': {
          'package:flutter/widgets.dart': {},
          'package:material_ui/material_ui.dart': {},
          'package:cupertino_ui/cupertino_ui.dart': {},
        },
      }),
      cacheDir: p.join(fixture, '.dart_tool', 'solid_fuse_gen', 'cache'),
    );
  });

  test('covers nearly everything', () {
    final widgets = (m['widgets']! as List).length;
    // Widgets only: static functions JS may call are a surface of their own.
    final skipped = (m['skipped']! as List).cast<Json>().where((s) => !(s['reason']! as String).startsWith('function: ')).toList();
    // Builders wait for synchronous Dart -> JS calls, nested refs and async
    // callbacks for wire format work; this counts the rest.
    bool waiting(String r) => r.contains('needs sync') || r.contains('bridge yet') || r.contains('not constructible');
    final other = skipped.where((s) => !waiting(s['reason']! as String)).length;
    expect(widgets, greaterThan(550));
    expect(other / (widgets + skipped.length), lessThan(0.05));
  });

  test('every ref resolves and nothing failed internally', () {
    expect(validate(m), isEmpty);
  });
}
