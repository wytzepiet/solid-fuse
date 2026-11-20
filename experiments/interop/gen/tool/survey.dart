// Part 1: survey of every public concrete Widget constructor parameter in
// widgets.dart / material.dart / cupertino.dart (or any extra library).
//
//   dart run tool/survey.dart [--lib package:x/x.dart=prefix ...] [--only-extra] [--out out/survey]
import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/element/element.dart';

import 'src/classify.dart';
import 'src/world.dart';

class Row {
  late String lib, widget, ctor, name, type, family, sub, label;
  late bool primaryCtor, factory, required, mustSupply, positional, hasDefault, deprecated, ok, partial;
  late bool okNested;
  late String labelNested;
  String? coll;
}

String famOf(FormalParameterElement p, Cls c) {
  if (c.family == 'widget' && c.sub == 'slot') {
    if (c.coll == null && p.name == 'child') return 'child';
    if (c.coll != null && p.name == 'children') return 'children';
    return c.coll == null ? 'slot' : 'slot-list';
  }
  return c.sub;
}

Future<void> main(List<String> args) async {
  final extra = <(String, String)>[];
  var out = 'out/survey';
  var onlyExtra = false;
  for (var i = 0; i < args.length; i++) {
    if (args[i] == '--lib') {
      final parts = args[++i].split('=');
      extra.add((parts[0], parts[1]));
    } else if (args[i] == '--out') {
      out = args[++i];
    } else if (args[i] == '--only-extra') {
      onlyExtra = true;
    }
  }
  final sw = Stopwatch()..start();
  final w = await World.load('.', extraLibs: extra);
  stderr.writeln('loaded element model in ${sw.elapsedMilliseconds}ms; ${w.publicClasses.length} public classes, ${w.staticConsts.length} static consts');
  // No cap on constant namespaces: the survey asks what is derivable in principle.
  final strict = Classifier(w, maxConsts: 1 << 30);
  final nested = Classifier(w, nested: true, maxConsts: 1 << 30);

  final libs = onlyExtra
      ? [for (final e in extra) e.$1]
      : ['package:flutter/widgets.dart', 'package:flutter/material.dart', 'package:flutter/cupertino.dart', for (final e in extra) e.$1];
  final seen = <ClassElement, String>{};
  for (final l in libs) {
    for (final c in w.widgetsOf(l)) {
      seen.putIfAbsent(c, () => l.replaceFirst('package:', '').replaceFirst(RegExp(r'/.*'), '') == 'flutter' ? l.split('/').last.replaceFirst('.dart', '') : l.split('/')[0].replaceFirst('package:', ''));
    }
  }
  final rows = <Row>[];
  var ctorCount = 0, deprecatedWidgets = 0, genericWidgets = 0, noPublicCtor = 0;
  for (final e in seen.entries) {
    final c = e.key;
    if (c.metadata.hasDeprecated) deprecatedWidgets++;
    if (c.typeParameters.isNotEmpty) genericWidgets++;
    final ctors = c.constructors.where((k) => k.isPublic && !k.metadata.hasDeprecated).toList();
    if (ctors.isEmpty) noPublicCtor++;
    final primary = ctors.where((k) => k.name == null || k.name == 'new').firstOrNull ?? ctors.firstOrNull;
    for (final k in ctors) {
      ctorCount++;
      for (final p in k.formalParameters) {
        final cs = strict.classify(p.type);
        final cn = nested.classify(p.type);
        final pp = P(p, p.type, cs);
        rows.add(Row()
          ..lib = e.value
          ..widget = c.name!
          ..ctor = (k.name == null || k.name == 'new') ? '' : k.name!
          ..primaryCtor = k == primary
          ..factory = k.isFactory
          ..name = p.name ?? '_'
          ..type = w.ts.promoteToNonNull(p.type).getDisplayString()
          ..family = cs.family
          ..sub = famOf(p, cs)
          ..coll = cs.coll
          ..label = '${cs.family}/${famOf(p, cs)}'
          ..labelNested = '${cn.family}/${famOf(p, cn)}'
          ..required = p.isRequired
          ..mustSupply = pp.mustSupply
          ..positional = p.isPositional
          ..hasDefault = p.hasDefaultValue
          ..deprecated = p.metadata.hasDeprecated
          ..ok = cs.ok
          ..okNested = cn.ok
          ..partial = cs.partial);
      }
    }
  }

  final b = StringBuffer();
  String pct(int n, int d) => d == 0 ? '-' : '${(100 * n / d).toStringAsFixed(1)}%';
  final total = rows.length;
  b.writeln('# Survey\n');
  b.writeln('- widgets (public, concrete, Widget subclasses): ${seen.length}  (by lib: ${_count(seen.values)})');
  b.writeln('- deprecated widget classes: $deprecatedWidgets, generic widget classes: $genericWidgets, without public ctor: $noPublicCtor');
  b.writeln('- public non-deprecated constructors: $ctorCount (generative ${rows.where((r) => !r.factory).map((r) => '${r.widget}.${r.ctor}').toSet().length} with params, factory ${rows.where((r) => r.factory).map((r) => '${r.widget}.${r.ctor}').toSet().length} with params)');
  b.writeln('- constructor parameters: $total (generative only: ${rows.where((r) => !r.factory).length}; primary ctor only: ${rows.where((r) => r.primaryCtor).length})');
  b.writeln('- required: ${rows.where((r) => r.required).length}, must-supply (required non-null): ${rows.where((r) => r.mustSupply).length}, positional: ${rows.where((r) => r.positional).length}, with default: ${rows.where((r) => r.hasDefault).length}, deprecated params: ${rows.where((r) => r.deprecated).length}');
  b.writeln('- distinct parameter types: ${rows.map((r) => r.type).toSet().length}\n');

  void table(String title, List<Row> rs, String Function(Row) key, {int? top}) {
    final m = <String, int>{};
    final okm = <String, int>{};
    for (final r in rs) {
      m[key(r)] = (m[key(r)] ?? 0) + 1;
      if (r.ok) okm[key(r)] = (okm[key(r)] ?? 0) + 1;
    }
    final es = m.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    b.writeln('## $title\n');
    b.writeln('| class | params | % | covered by general rules |');
    b.writeln('|---|---:|---:|---:|');
    for (final e in (top == null ? es : es.take(top))) {
      b.writeln('| ${e.key} | ${e.value} | ${pct(e.value, rs.length)} | ${pct(okm[e.key] ?? 0, e.value)} |');
    }
    b.writeln();
  }

  table('Parameters by family (all public ctors)', rows, (r) => r.family);
  table('Parameters by family/sub-class (all public ctors)', rows, (r) => r.label + (r.coll != null && r.family != 'widget' ? ' [${r.coll}]' : ''));
  table('Parameters by family (primary ctor only)', rows.where((r) => r.primaryCtor).toList(), (r) => r.family);
  table('Data-class params: full vs partial', rows.where((r) => r.family == 'data').toList(), (r) => r.partial ? 'data (some optional ctor params dropped)' : 'data (all ctor params bridgeable)');

  // Rule-family cumulative coverage.
  bool covered(Row r, int stage, {bool nestedData = false}) {
    final f = r.family;
    final ok = nestedData ? r.okNested : r.ok;
    final fam = nestedData ? r.labelNested.split('/').first : f;
    if (!ok) return false;
    return switch (fam) {
      'primitive' || 'enum' => true,
      'key' => stage >= 0,
      'widget' => stage >= 1,
      'callback' => stage >= 2,
      'data' => stage >= 3,
      'handle' => stage >= 4,
      'generic' || 'dynamic' => stage >= 5,
      _ => false,
    };
  }

  const stages = [
    'primitives + enums (+ key ignored)',
    '+ widget slots (child/children/named slots)',
    '+ void callbacks with encodable args',
    '+ data classes (recursive ctor rule, unions) + static-const enum-likes',
    '+ handles (Listenable/controllers/FocusNode via node.handle)',
    '+ generics / Object as raw JSON',
    '+ nested widgets/callbacks/handles inside data classes (wire extension)',
  ];
  b.writeln('## Cumulative coverage by rule family\n');
  b.writeln('| rule families implemented | params covered (all ctors) | params covered (primary ctors) | widgets fully covered (primary ctor) | widgets usable (all must-supply params covered) |');
  b.writeln('|---|---:|---:|---:|---:|');
  final byWidget = <String, List<Row>>{};
  for (final r in rows.where((r) => r.primaryCtor)) {
    (byWidget['${r.lib}:${r.widget}'] ??= []).add(r);
  }
  final nWidgets = seen.length; // widgets without params count as covered
  final noParam = nWidgets - byWidget.length;
  for (var s = 0; s < stages.length; s++) {
    final nd = s == 6;
    final st = nd ? 5 : s;
    final c = rows.where((r) => covered(r, st, nestedData: nd)).length;
    final prim = rows.where((r) => r.primaryCtor).toList();
    final cp = prim.where((r) => covered(r, st, nestedData: nd)).length;
    final full = byWidget.values.where((rs) => rs.every((r) => covered(r, st, nestedData: nd))).length + noParam;
    final usable = byWidget.values.where((rs) => rs.every((r) => !r.mustSupply || covered(r, st, nestedData: nd))).length + noParam;
    b.writeln('| ${stages[s]} | $c (${pct(c, total)}) | $cp (${pct(cp, prim.length)}) | $full (${pct(full, nWidgets)}) | $usable (${pct(usable, nWidgets)}) |');
  }
  b.writeln();

  // What blocks widgets at the final stage.
  final blockers = <String, int>{};
  final blockersMust = <String, int>{};
  for (final rs in byWidget.values) {
    for (final l in rs.where((r) => !r.okNested).map((r) => r.labelNested).toSet()) {
      blockers[l] = (blockers[l] ?? 0) + 1;
    }
    for (final l in rs.where((r) => !r.okNested && r.mustSupply).map((r) => r.labelNested).toSet()) {
      blockersMust[l] = (blockersMust[l] ?? 0) + 1;
    }
  }
  b.writeln('## What keeps widgets from being fully covered (primary ctor, after all rule families)\n');
  b.writeln('| class of blocking param | widgets with >=1 such param | widgets where it is must-supply |');
  b.writeln('|---|---:|---:|');
  for (final e in (blockers.entries.toList()..sort((a, b) => b.value.compareTo(a.value)))) {
    b.writeln('| ${e.key} | ${e.value} | ${blockersMust[e.key] ?? 0} |');
  }
  b.writeln();

  // Type histogram.
  final th = <String, int>{};
  final tl = <String, String>{};
  for (final r in rows) {
    th[r.type] = (th[r.type] ?? 0) + 1;
    tl[r.type] = r.family == 'widget' && r.ok ? 'widget/slot (child, children or named slot)' : r.label;
  }
  final tes = th.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
  b.writeln('## Top 50 parameter types\n');
  b.writeln('| # | type | params | cum % | class |');
  b.writeln('|---:|---|---:|---:|---|');
  var cum = 0;
  for (var i = 0; i < 50 && i < tes.length; i++) {
    cum += tes[i].value;
    b.writeln('| ${i + 1} | `${tes[i].key}` | ${tes[i].value} | ${pct(cum, total)} | ${tl[tes[i].key]} |');
  }
  b.writeln();
  final once = tes.where((e) => e.value == 1).length;
  final le3 = tes.where((e) => e.value <= 3).length;
  b.writeln('Long tail: ${tes.length} distinct types; top 50 cover ${pct(cum, total)}; ${tes.length - 50} types beyond the top 50 cover ${pct(total - cum, total)}; $once types occur once, $le3 occur <= 3 times.\n');
  // by family, distinct type count
  final distinctByFam = <String, Set<String>>{};
  for (final r in rows) {
    (distinctByFam[r.family] ??= {}).add(r.type);
  }
  b.writeln('Distinct types per family: ${distinctByFam.entries.map((e) => '${e.key}=${e.value.length}').join(', ')}\n');

  // Data types: distinct, with shapes.
  final dataTypes = <String, (int, Cls)>{};
  void collectData(Cls c, int n) {
    if (c.family != 'data') return;
    final k = c.data!.type.getDisplayString();
    final prev = dataTypes[k];
    dataTypes[k] = ((prev?.$1 ?? 0) + n, c);
  }

  for (final e in seen.keys) {
    for (final k in e.constructors.where((k) => k.isPublic && !k.metadata.hasDeprecated)) {
      for (final p in k.formalParameters) {
        collectData(strict.classify(p.type), 1);
      }
    }
  }
  final des = dataTypes.entries.toList()..sort((a, b) => b.value.$1.compareTo(a.value.$1));
  b.writeln('## Data-class types directly used as widget params (${des.length} distinct)\n');
  b.writeln('| type | params | shape | ctor variants | concrete classes in union | static consts | dropped optional params | rejected ctors |');
  b.writeln('|---|---:|---|---:|---:|---:|---:|---:|');
  for (final e in des.take(70)) {
    final d = e.value.$2.data!;
    b.writeln('| `${e.key}` | ${e.value.$1} | ${e.value.$2.sub} | ${d.variants.length} | ${d.variants.map((v) => v.type.element).toSet().length} | ${d.consts.length}${d.constsCapped ? ' (+${d.constCount - d.consts.length} capped)' : ''} | ${d.variants.fold<int>(0, (a, v) => a + v.dropped.length)} | ${d.rejected.length} |');
  }
  b.writeln();

  // Unbridgeable remainder by type.
  void topTypes(String title, bool Function(Row) f, [int n = 30]) {
    final m = <String, int>{};
    for (final r in rows.where(f)) {
      final k = '`${r.type}` (${r.label})';
      m[k] = (m[k] ?? 0) + 1;
    }
    final es = m.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    b.writeln('## $title (${rows.where(f).length} params, ${es.length} distinct types)\n');
    for (final e in es.take(n)) {
      b.writeln('- ${e.value} x ${e.key}');
    }
    b.writeln();
  }

  topTypes('Unbridgeable remainder', (r) => r.family == 'unbridgeable', 40);
  topTypes('Callbacks that are not plain void+encodable', (r) => r.family == 'callback' && !r.ok, 30);
  topTypes('Builders', (r) => r.family == 'builder', 30);
  topTypes('Widget-subtype slots', (r) => r.family == 'widget' && !r.ok, 20);
  topTypes('Handles', (r) => r.family == 'handle', 25);
  topTypes('Generic / dynamic', (r) => r.family == 'generic' || r.family == 'dynamic', 15);
  topTypes('Keys', (r) => r.family == 'key', 5);

  Directory(File(out).parent.path).createSync(recursive: true);
  File('$out.md').writeAsStringSync(b.toString());
  File('$out.json').writeAsStringSync(jsonEncode([
    for (final r in rows)
      {
        'lib': r.lib, 'widget': r.widget, 'ctor': r.ctor, 'name': r.name, 'type': r.type,
        'class': r.label, 'coll': r.coll, 'ok': r.ok, 'okNested': r.okNested, 'partial': r.partial,
        'required': r.required, 'mustSupply': r.mustSupply, 'positional': r.positional,
        'hasDefault': r.hasDefault, 'deprecated': r.deprecated, 'primary': r.primaryCtor, 'factory': r.factory,
      }
  ]));
  stderr.writeln('wrote $out.md / $out.json in ${sw.elapsedMilliseconds}ms');
}

String _count(Iterable<String> xs) {
  final m = <String, int>{};
  for (final x in xs) {
    m[x] = (m[x] ?? 0) + 1;
  }
  return m.entries.map((e) => '${e.key} ${e.value}').join(', ');
}
