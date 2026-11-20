// Part 1: survey of every non-record class that appears as a widget
// constructor parameter type in widgets/material/cupertino, with each public
// member classified by how it would cross an async JSON bridge; plus the
// "subclass me" classes (delegates, painters, formatters) as candidates for
// callback interfaces.
//
//   dart run tool/survey_objects.dart            -> out/objects-survey.md + .json
import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';

import 'src/classify.dart';
import 'src/objects.dart';
import 'src/world.dart';

const namedInterfaces = [
  'CustomPainter', 'CustomClipper', 'SliverPersistentHeaderDelegate', 'TextInputFormatter', 'ScrollBehavior',
  'FlowDelegate', 'MultiChildLayoutDelegate', 'SingleChildLayoutDelegate', 'SliverChildDelegate',
  'SliverGridDelegate', 'SearchDelegate', 'NavigatorObserver', 'RouterDelegate', 'RouteInformationParser',
  'TextSelectionControls', 'ScrollPhysics', 'WidgetStateProperty', 'Simulation', 'Animatable', 'Curve',
  'TransitionDelegate', 'BackButtonDispatcher', 'RouteInformationProvider', 'ImageProvider', 'Decoration',
  'ShapeBorder', 'InputBorder', 'TextSelectionHandleControls', 'FloatingActionButtonLocation',
  'FloatingActionButtonAnimator', 'PageTransitionsBuilder', 'SliverGridLayout', 'LocalizationsDelegate',
  'SpellCheckService', 'UndoHistoryController', 'ContextMenuController', 'Listenable',
];

late World w;
late Classifier c;
late ObjectModeler om;

String pct(int a, int b) => b == 0 ? '-' : '${(100 * a / b).toStringAsFixed(1)}%';

Future<void> main(List<String> args) async {
  final sw = Stopwatch()..start();
  w = await World.load('.');
  c = Classifier(w, maxConsts: 1 << 30);
  om = ObjectModeler(w, c);
  stderr.writeln('loaded in ${sw.elapsedMilliseconds}ms');

  // ── population ──────────────────────────────────────────────────────────
  final widgets = <ClassElement>{};
  for (final l in ['package:flutter/widgets.dart', 'package:flutter/material.dart', 'package:flutter/cupertino.dart']) {
    widgets.addAll(w.widgetsOf(l));
  }
  final usage = <InterfaceElement, int>{}; // params using the type
  final usedBy = <InterfaceElement, Set<String>>{};
  final firstType = <InterfaceElement, InterfaceType>{};
  final ifaceUsage = <InterfaceElement, int>{};
  final ifaceType = <InterfaceElement, InterfaceType>{};
  var paramCount = 0, ctorCount = 0;

  bool isAbstractWithAbstractMembers(InterfaceType t) {
    final el = t.element;
    if (el is! ClassElement || !el.isAbstract) return false;
    return abstractMembers(t).isNotEmpty;
  }

  void visit(DartType t, String widget) {
    final nn = w.ts.promoteToNonNull(t);
    if (nn is! InterfaceType) return;
    if (nn.isDartCoreList || nn.isDartCoreSet || nn.isDartCoreIterable) return visit(nn.typeArguments.first, widget);
    if (nn.isDartCoreMap) return visit(nn.typeArguments[1], widget);
    final el = nn.element;
    if (!w.isExported(el) || el.isPrivate) return;
    if (om.isObject(nn)) {
      usage[el] = (usage[el] ?? 0) + 1;
      (usedBy[el] ??= {}).add(widget);
      firstType.putIfAbsent(el, () => nn);
    } else if (!el.library.uri.toString().startsWith('dart:') && isAbstractWithAbstractMembers(nn) && !w.isSubtypeOfEl(nn, w.widgetEl) && !w.isSubtypeOfEl(nn, w.keyEl) && el != w.buildContextEl) {
      ifaceUsage[el] = (ifaceUsage[el] ?? 0) + 1;
      ifaceType.putIfAbsent(el, () => nn);
    }
  }

  for (final k in widgets) {
    for (final ctor in k.constructors.where((x) => x.isPublic && !x.metadata.hasDeprecated)) {
      ctorCount++;
      for (final p in ctor.formalParameters) {
        paramCount++;
        visit(p.type, k.name!);
      }
    }
  }

  // Objects that nobody can construct (abstract, no exported concrete subclass,
  // no factory) are "subclass me" classes: move them to the interface list.
  bool constructible(InterfaceType t) {
    final el = t.element;
    if (el is ClassElement && !el.isAbstract && om.model(t).ctors.isNotEmpty) return true;
    if (om.model(t).ctors.isNotEmpty) return true; // factories
    return w.subclassesOf(el).any((s) => s is ClassElement && !s.isAbstract && s.isPublic);
  }

  final objects = <InterfaceElement>[];
  for (final e in usage.keys.toList()) {
    if (constructible(firstType[e]!)) {
      objects.add(e);
    } else {
      ifaceUsage[e] = usage[e]!;
      ifaceType[e] = firstType[e]!;
    }
  }
  objects.sort((a, b) => usage[b]!.compareTo(usage[a]!));

  // ── per-class member classification ─────────────────────────────────────
  final rows = <Map<String, Object?>>[];
  final tot = <String, int>{};
  void add(String k, [int n = 1]) => tot[k] = (tot[k] ?? 0) + n;
  final whyMethod = <String, int>{}, whyGetter = <String, int>{}, whyCtor = <String, int>{}, whySetter = <String, int>{};
  final whyExamples = <String, List<String>>{};
  void why(Map<String, int> m, String reason, String example) {
    final r = reason.replaceAll(RegExp(r'^[A-Za-z0-9_]+: '), '');
    m[r] = (m[r] ?? 0) + 1;
    final ex = whyExamples[r] ??= [];
    if (ex.length < 5) ex.add(example);
  }

  for (final el in objects) {
    final t = firstType[el]!;
    final o = om.model(t);
    final usableCtors = o.ctors.where((k) => k.usable).toList();
    final ownCtor = o.ctors.isNotEmpty;
    final ctorParams = o.ctors.expand((k) => k.params).toList();
    final envCtors = o.ctors.where((k) => k.params.any((p) => p.kind.startsWith('env'))).length;
    final mOk = o.methods.where((m) => m.ok).toList();
    final gValue = o.getters.where((g) => g.ret.kind == 'value').toList();
    final gObject = o.getters.where((g) => g.ret.kind == 'object').toList();
    final gStream = o.getters.where((g) => g.ret.kind == 'stream').toList();
    final gBad = o.getters.where((g) => !g.ret.ok).toList();
    final sOk = o.setters.where((s) => s.ok).toList();
    add('classes');
    add('classes.push.${o.push}');
    if (o.hasDispose) add('classes.dispose');
    if (ownCtor) add('classes.ownCtor');
    if (usableCtors.isNotEmpty) add('classes.usableCtor');
    if (!ownCtor) add('classes.viaSubclassOnly');
    add('ctors', o.ctors.length);
    add('ctors.usable', usableCtors.length);
    add('ctors.env', envCtors);
    add('ctorParams', ctorParams.length);
    for (final p in ctorParams) {
      add('ctorParams.${p.kind}');
      if (p.kind == 'unbridgeable') why(whyCtor, p.why ?? '?', '${o.name}.${p.name}');
    }
    add('methods', o.methods.length);
    add('methods.ok', mOk.length);
    add('methods.standalone', o.methods.where((m) => m.okStandalone).length);
    for (final m in o.methods) {
      add('methods.ret.${m.ret.label}');
      if (m.ok) add('methods.ok.${m.ret.label}');
      if (!m.ok) why(whyMethod, m.blocker!, '${o.name}.${m.name}');
    }
    add('getters', o.getters.length);
    add('getters.value', gValue.length);
    add('getters.object', gObject.length);
    add('getters.stream', gStream.length);
    add('getters.future', o.getters.where((g) => g.ret.isAsync && g.ret.ok).length);
    add('getters.unbridgeable', gBad.length);
    for (final g in gBad) {
      why(whyGetter, g.ret.why ?? '?', '${o.name}.${g.name}');
    }
    add('setters', o.setters.length);
    add('setters.ok', sOk.length);
    for (final s in o.setters.where((s) => !s.ok)) {
      why(whySetter, '${s.param.kind} ${s.param.why ?? ''}', '${o.name}.${s.name}');
    }
    rows.add({
      'class': o.name,
      'lib': el.library.uri.toString(),
      'usage': usage[el],
      'widgets': usedBy[el]!.length,
      'abstract': o.isAbstract,
      'push': o.push,
      'valueOf': o.valueListenableOf?.getDisplayString(),
      'status': o.hasStatus,
      'dispose': o.hasDispose,
      'ctors': [
        for (final k in o.ctors)
          {
            'name': k.name,
            'usable': k.usable,
            'blocker': k.blocker,
            'params': [for (final p in k.params) {'name': p.name, 'type': p.type.getDisplayString(), 'kind': p.kind, 'why': p.why}],
          }
      ],
      'methods': [
        for (final m in o.methods)
          {'name': m.name, 'ok': m.ok, 'ret': m.ret.label, 'blocker': m.blocker, 'sig': m.el.type.getDisplayString(), 'from': m.declaredIn.name}
      ],
      'getters': [
        for (final g in o.getters) {'name': g.name, 'kind': g.ret.label, 'type': g.el.returnType.getDisplayString(), 'why': g.ret.why, 'from': g.declaredIn.name}
      ],
      'setters': [
        for (final s in o.setters) {'name': s.name, 'ok': s.ok, 'type': s.param.type.getDisplayString()}
      ],
    });
  }

  // ── broader population: every exported identity class in package:flutter ─
  final broad = <InterfaceElement>[
    for (final k in w.publicClasses)
      if (k is ClassElement &&
          k.library.uri.toString().startsWith('package:flutter/') &&
          !k.metadata.hasDeprecated &&
          om.isObject(k.thisType))
        k
  ];
  final bt = <String, int>{};
  void badd(String k, [int n = 1]) => bt[k] = (bt[k] ?? 0) + n;
  for (final k in broad) {
    final o = om.model(k.thisType);
    badd('classes');
    badd('classes.push.${o.push}');
    if (o.isAbstract) badd('classes.abstract');
    if (o.ctors.isNotEmpty) badd('classes.ownCtor');
    if (o.ctors.any((x) => x.usable)) badd('classes.usableCtor');
    if (o.ctors.any((x) => x.params.any((p) => p.kind == 'env-vsync'))) badd('classes.vsync');
    if (o.ctors.isNotEmpty && o.ctors.every((x) => x.params.any((p) => p.kind == 'env-context' && p.mustSupply))) badd('classes.needsContext');
    badd('methods', o.methods.length);
    badd('methods.ok', o.methods.where((m) => m.ok).length);
    badd('methods.standalone', o.methods.where((m) => m.okStandalone).length);
    badd('getters', o.getters.length);
    badd('getters.value', o.getters.where((g) => g.ret.kind == 'value').length);
    badd('getters.object', o.getters.where((g) => g.ret.kind == 'object').length);
    badd('setters', o.setters.length);
    badd('setters.ok', o.setters.where((x) => x.ok).length);
  }

  // ── callback-interface candidates ───────────────────────────────────────
  for (final n in namedInterfaces) {
    final el = om.w.material.exportNamespace.get2(n) ?? w.entries.map((e) => e.element.exportNamespace.get2(n)).whereType<Element>().firstOrNull;
    if (el is InterfaceElement) {
      ifaceUsage.putIfAbsent(el, () => usage[el] ?? 0);
      ifaceType.putIfAbsent(el, () => firstType[el] ?? el.thisType);
    }
  }
  final ifaces = <Map<String, Object?>>[];
  for (final el in ifaceUsage.keys) {
    final t = ifaceType[el]!;
    final abs = abstractMembers(t);
    final own = abs.isNotEmpty
        ? abs
        : [
            for (final m in el.methods)
              if (!m.isStatic && m.isPublic && !m.isOperator && !plumbing.contains(m.name) && !(m.name ?? '').startsWith('debug')) m
          ];
    final ms = <Map<String, Object?>>[];
    var worst = 0;
    for (final m in own) {
      final v = ifaceMethod(m);
      ms.add(v);
      worst = [worst, v['rank'] as int].reduce((a, b) => a > b ? a : b);
    }
    final dataCls = c.classify(t);
    ifaces.add({
      'class': el.name,
      'usage': ifaceUsage[el],
      'abstractMembers': abs.length,
      'listenable': w.isSubtypeOfEl(t, w.listenableEl),
      'concreteSubclasses': w.subclassesOf(el).where((s) => s is ClassElement && !s.isAbstract && s.isPublic).length,
      'recordAlternative': dataCls.family == 'data' && dataCls.ok,
      'verdict': const ['async-ok', 'sync-return', 'builder', 'never'][worst],
      'methods': ms,
    });
  }
  ifaces.sort((a, b) => (b['usage'] as int).compareTo(a['usage'] as int));

  // ── output ──────────────────────────────────────────────────────────────
  final b = StringBuffer();
  b.writeln('# Objects survey (generated by tool/survey_objects.dart)\n');
  b.writeln('Population: ${widgets.length} concrete widget classes, $ctorCount constructors, $paramCount parameters.');
  b.writeln('Non-record classes used as parameter types: **${objects.length} constructible objects** '
      '(${usage.entries.where((e) => objects.contains(e.key)).fold<int>(0, (a, e) => a + e.value)} parameter uses) and '
      '**${ifaces.length} "subclass me" / interface candidates**.\n');
  b.writeln('## Totals over the ${objects.length} object classes\n');
  b.writeln('| measure | n | by rule | % |\n|---|---:|---:|---:|');
  void row(String label, String total, String ok) => b.writeln('| $label | ${tot[total] ?? 0} | ${tot[ok] ?? 0} | ${pct(tot[ok] ?? 0, tot[total] ?? 0)} |');
  row('classes with an own public constructor', 'classes', 'classes.ownCtor');
  row('classes with a rule-usable constructor', 'classes', 'classes.usableCtor');
  row('constructors usable', 'ctors', 'ctors.usable');
  row('methods bridgeable (args decodable, result encodable)', 'methods', 'methods.ok');
  row('methods bridgeable with no other object crossing', 'methods', 'methods.standalone');
  row('getters mirrorable as a value', 'getters', 'getters.value');
  row('setters bridgeable', 'setters', 'setters.ok');
  b.writeln('\nPush channel: ${[
    for (final k in ['valueListenable', 'listenable', 'stream', 'none']) '$k ${tot['classes.push.$k'] ?? 0}'
  ].join(', ')}; with `dispose()`: ${tot['classes.dispose'] ?? 0}; only constructible through a subclass: ${tot['classes.viaSubclassOnly'] ?? 0}.\n');
  b.writeln('Constructor parameters by kind: ${(tot.entries.where((e) => e.key.startsWith('ctorParams.')).toList()..sort((a, b) => b.value.compareTo(a.value))).map((e) => '${e.key.substring(11)} ${e.value}').join(', ')} (of ${tot['ctorParams']}). Constructors with an environmental parameter: ${tot['ctors.env'] ?? 0}.\n');
  b.writeln('Method results: ${(tot.entries.where((e) => e.key.startsWith('methods.ret.')).toList()..sort((a, b) => b.value.compareTo(a.value))).map((e) => '${e.key.substring(12)} ${e.value} (${tot['methods.ok.${e.key.substring(12)}'] ?? 0} ok)').join(', ')}.\n');
  b.writeln('Getters: value ${tot['getters.value']}, object ${tot['getters.object']}, stream ${tot['getters.stream'] ?? 0}, unbridgeable ${tot['getters.unbridgeable']} (of ${tot['getters']}); of the bridgeable ones ${tot['getters.future'] ?? 0} are Futures.\n');

  b.writeln('### Broader population: every exported class in package:flutter with identity (${bt['classes']} classes)\n');
  b.writeln('Listenable, or has `dispose()`, or named `*Controller` / `*FocusNode`; widgets, States, RenderObjects and Elements excluded. ${bt['classes.abstract']} are abstract.\n');
  b.writeln('| measure | n | by rule | % |\n|---|---:|---:|---:|');
  void brow(String label, String total, String ok) => b.writeln('| $label | ${bt[total] ?? 0} | ${bt[ok] ?? 0} | ${pct(bt[ok] ?? 0, bt[total] ?? 0)} |');
  brow('classes with an own public constructor', 'classes', 'classes.ownCtor');
  brow('classes with a rule-usable constructor', 'classes', 'classes.usableCtor');
  brow('methods bridgeable', 'methods', 'methods.ok');
  brow('methods bridgeable with no other object crossing', 'methods', 'methods.standalone');
  brow('getters mirrorable as a value', 'getters', 'getters.value');
  brow('getters returning another object', 'getters', 'getters.object');
  brow('setters bridgeable', 'setters', 'setters.ok');
  b.writeln('\nPush channel: ${[for (final k in ['valueListenable', 'listenable', 'stream', 'none']) '$k ${bt['classes.push.$k'] ?? 0}'].join(', ')}; constructors taking a TickerProvider: ${bt['classes.vsync'] ?? 0} classes; every constructor needs a BuildContext: ${bt['classes.needsContext'] ?? 0} classes.\n');

  void whyTable(String title, Map<String, int> m) {
    b.writeln('### $title\n\n| reason | n | examples |\n|---|---:|---|');
    for (final e in (m.entries.toList()..sort((a, b) => b.value.compareTo(a.value))).take(25)) {
      b.writeln('| ${e.key.replaceAll('|', r'\|')} | ${e.value} | ${whyExamples[e.key]!.map((x) => '`$x`').join(', ')} |');
    }
    b.writeln();
  }

  whyTable('Why methods are not bridgeable', whyMethod);
  whyTable('Why getters are not mirrorable', whyGetter);
  whyTable('Why constructor parameters are not bridgeable', whyCtor);
  whyTable('Why setters are not bridgeable', whySetter);

  b.writeln('## Top 30 object classes by usage\n');
  b.writeln('| # | class | param uses | widgets | push | ctor | methods ok | value getters | object getters | setters ok |\n|---:|---|---:|---:|---|---|---:|---:|---:|---:|');
  var i = 0;
  for (final r in rows.take(30)) {
    final ms = r['methods'] as List;
    final gs = r['getters'] as List;
    final ss = r['setters'] as List;
    final ks = r['ctors'] as List;
    final ctor = ks.isEmpty
        ? 'via subclass'
        : ks.any((k) => k['usable'] == true)
            ? (ks.any((k) => (k['params'] as List).any((p) => p['kind'] == 'env-vsync')) ? 'ok + vsync' : 'ok')
            : 'blocked: ${ks.first['blocker']}';
    b.writeln('| ${++i} | `${r['class']}`${r['abstract'] == true ? ' (abstract)' : ''} | ${r['usage']} | ${r['widgets']} | ${r['push']}${r['valueOf'] != null ? '<${r['valueOf']}>' : ''} | $ctor | '
        '${ms.where((m) => m['ok'] == true).length}/${ms.length} | ${gs.where((g) => g['kind'] == 'value').length}/${gs.length} | ${gs.where((g) => g['kind'] == 'object').length} | ${ss.where((s) => s['ok'] == true).length}/${ss.length} |');
  }

  b.writeln('\n## All ${objects.length} object classes\n');
  b.writeln('| class | uses | push | usable ctor | methods ok | value getters | setters ok | unbridgeable members |\n|---|---:|---|---|---:|---:|---:|---|');
  for (final r in rows) {
    final ms = r['methods'] as List;
    final gs = r['getters'] as List;
    final ss = r['setters'] as List;
    final ks = r['ctors'] as List;
    final bad = [
      ...ms.where((m) => m['ok'] != true).map((m) => '${m['name']}()'),
      ...gs.where((g) => g['kind'] == 'unbridgeable').map((g) => '${g['name']}'),
    ];
    b.writeln('| `${r['class']}` | ${r['usage']} | ${r['push']} | ${ks.isEmpty ? 'via subclass' : ks.any((k) => k['usable'] == true) ? 'yes' : 'no'} | '
        '${ms.where((m) => m['ok'] == true).length}/${ms.length} | ${gs.where((g) => g['kind'] == 'value').length}/${gs.length} | ${ss.where((s) => s['ok'] == true).length}/${ss.length} | ${bad.take(8).join(', ')}${bad.length > 8 ? ', +${bad.length - 8}' : ''} |');
  }

  b.writeln('\n## Callback-interface candidates ("subclass me")\n');
  b.writeln('Direction is Dart calls JS. `fire` = void, fire-and-forget; `async` = returns a Future; `sync` = returns a value synchronously; `builder` = returns a Widget; `opaque` = an argument cannot be encoded (Canvas, RenderObject, ...).\n');
  final vc = <String, int>{};
  for (final r in ifaces) {
    vc[r['verdict'] as String] = (vc[r['verdict'] as String] ?? 0) + 1;
  }
  b.writeln('Verdicts: ${vc.entries.map((e) => '${e.key} ${e.value}').join(', ')} (of ${ifaces.length}).\n');
  for (final alt in [false, true]) {
    final part = ifaces.where((r) => (r['recordAlternative'] == true) == alt).toList();
    final pv = <String, int>{};
    for (final r in part) {
      pv[r['verdict'] as String] = (pv[r['verdict'] as String] ?? 0) + 1;
    }
    b.writeln(alt
        ? '### With a record alternative (built-in subclasses are usable as plain values; only user subclasses are lost): ${part.length}\n'
        : '### No record alternative (the user must subclass): ${part.length}\n');
    b.writeln('Verdicts: ${pv.entries.map((e) => '${e.key} ${e.value}').join(', ')}.\n');
  b.writeln('| class | param uses | verdict | record alternative | methods to implement |\n|---|---:|---|---|---|');
  for (final r in part) {
    final ms = (r['methods'] as List).map((m) => '`${m['name']}`: ${m['kind']}').join('; ');
    b.writeln('| `${r['class']}` | ${r['usage']} | ${r['verdict']} | ${r['recordAlternative'] == true ? 'yes (${r['concreteSubclasses']} subclasses)' : 'no'} | $ms |');
  }
    b.writeln();
  }

  Directory('out').createSync();
  File('out/objects-survey.md').writeAsStringSync(b.toString());
  File('out/objects-survey.json').writeAsStringSync(const JsonEncoder.withIndent(' ').convert({'totals': tot, 'objects': rows, 'interfaces': ifaces}));
  stderr.writeln('objects: ${objects.length}, interfaces: ${ifaces.length}; wrote out/objects-survey.md in ${sw.elapsedMilliseconds}ms');
}

List<MethodElement> abstractMembers(InterfaceType t) {
  final names = <String>{};
  for (final st in [t, ...t.allSupertypes]) {
    if (st.isDartCoreObject) continue;
    for (final m in st.methods) {
      if (!m.isStatic && m.isPublic && m.name != null) names.add(m.name!);
    }
  }
  final out = <MethodElement>[];
  for (final n in names.toList()..sort()) {
    if (plumbing.contains(n)) continue;
    if (t.lookUpMethod(n, w.material, concrete: true) != null) continue;
    final m = t.lookUpMethod(n, w.material);
    if (m != null && !m.isOperator) out.add(m);
  }
  return out;
}

Map<String, Object?> ifaceMethod(MethodElement m) {
  final r = m.returnType;
  var opaque = <String>[];
  var objs = <String>[];
  for (final p in m.formalParameters) {
    final t = p.type;
    final nn = w.ts.promoteToNonNull(t);
    if (nn is InterfaceType && nn.element == w.buildContextEl) continue;
    if (om.isObject(t)) {
      objs.add(t.getDisplayString());
      continue;
    }
    final e = c.encodable(t);
    // abstract argument classes and "every getter" encodings are context
    // objects with behaviour (Canvas, FlowPaintingContext), not payloads
    final absArg = nn is InterfaceType && nn.element is ClassElement && (nn.element as ClassElement).isAbstract && e.kind == 'class';
    if (!e.ok || e.weak || absArg) opaque.add(t.getDisplayString());
  }
  String kind;
  int rank;
  final isWidget = w.isSubtypeOfEl(r, w.widgetEl);
  if (opaque.isNotEmpty) {
    kind = 'opaque(${opaque.join(', ')})';
    rank = 3;
  } else if (isWidget) {
    kind = 'builder';
    rank = 2;
  } else if (r is VoidType) {
    kind = 'fire';
    rank = 0;
  } else if (r.isDartAsyncFuture || r.isDartAsyncFutureOr) {
    kind = 'async';
    rank = 0;
  } else {
    kind = 'sync ${r.getDisplayString()}';
    rank = 1;
  }
  if (objs.isNotEmpty) kind += ' +obj(${objs.join(', ')})';
  return {'name': m.name, 'kind': kind, 'rank': rank, 'sig': m.type.getDisplayString()};
}
