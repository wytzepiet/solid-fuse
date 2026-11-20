// Emitter for non-UI plugin APIs: the public top-level functions and static
// members of a library become one typed async TS module backed by one channel
// handler; classes with identity become objects (objgen.dart), reached through
// constructors or returned from functions.
part of 'gen.dart';

class ModuleEmitter {
  ModuleEmitter(this.g, this.om, this.oe, this.modName);
  final Generator g;
  final ObjectModeler om;
  final ObjectEmitter oe;
  final String modName;

  final _dartCases = StringBuffer();
  final _dartListen = StringBuffer();
  final _ts = StringBuffer();
  final _tsStatics = <String, List<String>>{}; // class -> members
  final surface = <Map<String, Object?>>[]; // one row per public API member
  final skipped = <String, String>{}; // exported name -> why it is not part of the callable surface
  var functions = 0, streams = 0;

  World get w => g.w;

  void _row(String kind, String name, bool ok, [String? why]) =>
      surface.add({'kind': kind, 'name': name, 'ok': ok, if (why != null) 'why': why});

  bool _hidden(Element e) =>
      e.isPrivate ||
      e.metadata.hasDeprecated ||
      e.metadata.hasVisibleForTesting ||
      e.metadata.hasInternal ||
      e.metadata.hasProtected;

  /// A class is a record when it has a real record shape in either direction.
  bool isRecord(InterfaceType t) {
    final e = g.c.encodable(t);
    if (e.ok && !e.weak) return true;
    // input-only options class: constructible from data and no behaviour
    final cls = g.c.classify(t);
    return cls.family == 'data' &&
        cls.ok &&
        (cls.data?.variants.any((v) => v.params.isNotEmpty) ?? false) &&
        om.model(t).methods.isEmpty;
  }

  /// First pass: decide which exported classes are objects, so that
  /// functions returning them can adopt.
  List<InterfaceType> collectObjects(LibraryElement lib) {
    final out = <InterfaceType>[];
    final names = lib.exportNamespace.definedNames2.keys.toList()..sort();
    for (final n in names) {
      final el = lib.exportNamespace.definedNames2[n];
      if (el is! ClassElement || _hidden(el)) continue;
      final uri = el.library.uri.toString();
      if (uri.startsWith('dart:') || uri.startsWith('package:flutter/')) continue;
      final t = w.ts.instantiateInterfaceToBounds(element: el, nullabilitySuffix: NullabilitySuffix.none);
      if (w.isSubtypeOfEl(t, w.widgetEl)) {
        skipped[n] = 'widget (widget generator)';
        continue;
      }
      final o = om.model(t);
      final hasBehaviour = o.methods.isNotEmpty || o.setters.isNotEmpty;
      if (om.isObject(t) || (!isRecord(t) && (hasBehaviour || o.getters.isNotEmpty))) {
        out.add(t);
      } else if (isRecord(t)) {
        skipped[n] = 'record (by the data rules)';
      } else {
        skipped[n] = 'no members';
      }
    }
    return out;
  }

  String _retTs(RetM r) {
    if (r.kind == 'object') {
      final el = oe.retObject(r.value);
      return '${el!.name}${g.nullable(r.value!) ? ' | null' : ''}';
    }
    return oe.tsRet(r);
  }

  /// Emits one callable. [target] is the Dart callee expression, [key] the
  /// wire method name, [tsName] the TS function name.
  bool _callable({
    required String key,
    required String target,
    required String owner,
    required List<ParamM> params,
    required RetM ret,
    required String? doc,
    required void Function(String sig, String body, String docText) tsOut,
    required String kind,
    bool isGetter = false,
    bool generic = false,
  }) {
    String? why;
    if (generic) why = 'generic function';
    if (why == null && !ret.ok) why = 'returns ${ret.why}';
    if (why == null && ret.kind == 'object' && oe.retObject(ret.value) == null) {
      why = 'returns ${ret.value!.getDisplayString()}, not a generated object';
    }
    Shape? s;
    if (why == null) {
      s = oe.shape(params, owner, 'a', objectExpr: (p) => "fuseObjArg<${g.tc(g.nn(p.type))}>(root, a['${p.name}'])");
      if (s.fail != null) why = s.fail;
    }
    if (why != null) {
      _row(kind, key, false, why);
      return false;
    }
    _row(kind, key, true, s!.dropped.isEmpty ? null : 'dropped optional: ${s.dropped.keys.join(', ')}');
    final inv = isGetter ? target : '$target(${s.dartArgs})';
    final docText = g.docs == 'none' ? '' : g._jsdoc(g._docText(doc), '');
    final argNames = [...s.tsPos.map((p) => p.split(RegExp(r'\??:')).first), if (s.tsNamed.isNotEmpty) 'opts'].join(', ');
    if (ret.kind == 'stream') {
      streams++;
      _dartListen.writeln("          case '$key':");
      _dartListen.writeln("            subs.listen((a[r'\$id'] as num).toInt(), $inv, (e) => ${g.enc(ret.value!, ret.enc!, 'e')});");
      _dartListen.writeln('            return null;');
      final et = oe.tsRet(RetM('value', value: ret.value, enc: ret.enc));
      tsOut('(${s.tsParams()}): FuseStream<$et>', '($argNames) => m.stream("$key", ${s.tsPack})', docText);
      return true;
    }
    functions++;
    final awaited = ret.isAsync ? 'await fuseAwait($inv)' : inv;
    _dartCases.writeln("        case '$key':");
    switch (ret.kind) {
      case 'void':
        _dartCases.writeln('          $awaited;');
        _dartCases.writeln('          return null;');
      case 'object':
        final el = oe.retObject(ret.value)!;
        final hasDispose = om.model(w.ts.promoteToNonNull(ret.value!) as InterfaceType).hasDispose;
        _dartCases.writeln("          return fuseAdopt(bridge.registry, $awaited, '${oe.tag(el)}'${hasDispose && !isGetter ? ', owned: true' : ''});");
      default:
        final enc = g.enc(ret.value!, ret.enc!, 'r');
        if (enc == 'r') {
          _dartCases.writeln('          return $awaited;');
        } else {
          _dartCases.writeln('          final r = $awaited;');
          _dartCases.writeln('          return $enc;');
        }
    }
    var call = 'm.invoke("$key", ${s.tsPack}${ret.isAsync ? ', 0' : ''})';
    if (ret.kind == 'object') {
      final rn = oe.retObject(ret.value)!.name!;
      call = '$call.then((r) => (r == null ? null : adopt$rn(r)))${g.nullable(ret.value!) ? '' : ' as Promise<$rn>'}';
    }
    tsOut('(${s.tsParams()}): Promise<${_retTs(ret)}>', '($argNames) => $call', docText);
    return true;
  }

  void addLibrary(LibraryElement lib) {
    final names = lib.exportNamespace.definedNames2.keys.toList()..sort();
    for (final n in names) {
      final el = lib.exportNamespace.definedNames2[n]!;
      final uri = el.library?.uri.toString() ?? '';
      if (uri.startsWith('dart:') || uri.startsWith('package:flutter/')) continue;
      if (_hidden(el)) continue;
      if (el is TopLevelFunctionElement) {
        _callable(
          kind: 'function',
          key: n,
          target: g.ref(el),
          owner: n,
          params: [for (final p in el.formalParameters) om.param(p)],
          ret: om.ret(el.returnType),
          doc: el.documentationComment,
          generic: el.typeParameters.isNotEmpty,
          tsOut: (sig, body, doc) {
            final params = sig.substring(1, sig.lastIndexOf('): '));
            final rt = sig.substring(sig.lastIndexOf('): ') + 3);
            _ts.write(doc);
            _ts.writeln('export function ${_tsId(n)}($params): $rt {');
            _ts.writeln('  return ${body.substring(body.indexOf('=> ') + 3)};');
            _ts.writeln('}');
            _ts.writeln();
          },
        );
      } else if (el is ClassElement) {
        final t = w.ts.instantiateInterfaceToBounds(element: el, nullabilitySuffix: NullabilitySuffix.none);
        if (w.isSubtypeOfEl(t, w.widgetEl)) continue;
        final o = om.model(t);
        for (final m in o.staticMethods) {
          _callable(
            kind: 'static method',
            key: '$n.${m.name}',
            target: '${g.ref(el)}.${m.name}',
            owner: '$n.${m.name}',
            params: m.params,
            ret: m.ret,
            doc: m.el.documentationComment,
            generic: m.el.typeParameters.isNotEmpty,
            tsOut: (sig, body, doc) => (_tsStatics[n] ??= []).add('${doc.replaceAll(RegExp(r'^', multiLine: true), '  ').trimRight()}\n  ${m.name}: ${_arrow(sig, body)},'.replaceFirst(RegExp(r'^\s*\n'), '')),
          );
        }
        for (final gt in o.staticGetters) {
          _callable(
            kind: 'static getter',
            key: '$n.${gt.name}',
            target: '${g.ref(el)}.${gt.name}',
            owner: '$n.${gt.name}',
            params: const [],
            ret: gt.ret,
            isGetter: true,
            doc: gt.el.documentationComment ?? gt.el.variable.documentationComment,
            tsOut: (sig, body, doc) => (_tsStatics[n] ??= []).add('${doc.replaceAll(RegExp(r'^', multiLine: true), '  ').trimRight()}\n  ${gt.name}: ${_arrow(sig, body)},'.replaceFirst(RegExp(r'^\s*\n'), '')),
          );
        }
      } else if (el is EnumElement) {
        skipped[n] = 'enum (by the data rules)';
      } else if (el is TopLevelVariableElement || el is GetterElement || el is SetterElement) {
        final isConst = el is TopLevelVariableElement && el.isConst || (el is GetterElement && el.variable.isConst);
        skipped[n] = isConst ? 'constant' : 'top-level variable';
        if (!isConst && el is! SetterElement) _row('top-level variable', n, false, 'top-level variables are not bridged');
      } else if (el is TypeAliasElement) {
        skipped[n] = 'typedef';
      } else if (el is ExtensionElement || el is MixinElement || el is ExtensionTypeElement) {
        skipped[n] = el.runtimeType.toString().replaceAll('ElementImpl', '').toLowerCase();
      }
    }
  }

  /// `(a: T): R` + `(a) => expr`  ->  `(a: T): R => expr`
  String _arrow(String sig, String body) => '$sig ${body.substring(body.indexOf('=> '))}';

  String get dartBody {
    final b = StringBuffer();
    final fn = 'register${_cap(_camel(modName))}Module';
    b.writeln('/// GENERATED channel module `mod:$modName`: $functions functions, $streams streams.');
    b.writeln('void $fn(FuseBridge bridge) {');
    b.writeln('  register${_cap(_camel(modName))}Wrappers();');
    if (streams > 0) b.writeln("  final subs = FuseSubscriptions(bridge, 'mod:$modName:event');");
    if (_dartCases.toString().contains('fuseObjArg') || _dartListen.toString().contains('fuseObjArg')) {
      b.writeln('  final root = bridge.registry.get(0);');
    }
    b.writeln("  bridge.on('mod:$modName', (data) => fuseGuard(() async {");
    b.writeln("      final a = fuseArgs(data['a']);");
    b.writeln("      switch (data['m']) {");
    b.write(_dartCases);
    if (streams > 0) {
      b.writeln("        case r'\$listen':");
      b.writeln("          switch (a[r'\$stream']) {");
      b.write(_dartListen);
      b.writeln('          }');
      b.writeln("        case r'\$cancel':");
      b.writeln("          subs.cancel((a[r'\$id'] as num).toInt());");
      b.writeln('          return null;');
    }
    b.writeln('      }');
    b.writeln("      return fuseUnknown('$modName', a[r'\$stream'] == null ? '\${data['m']}' : '\${data['m']} \${a[r'\$stream']}');");
    b.writeln('    }));');
    b.writeln('}');
    return b.toString();
  }

  /// Exception classes the package exports: Dart has no checked exceptions,
  /// so this is the closest thing to a declared error set. `FuseError.type`
  /// carries the Dart class name.
  final errorTypes = <String>[];

  void collectErrors(LibraryElement lib) {
    final core = w.entries.firstWhere((e) => e.uri == 'dart:core').element;
    final roots = [core.exportNamespace.get2('Exception'), core.exportNamespace.get2('Error')];
    final names = lib.exportNamespace.definedNames2.keys.toList()..sort();
    for (final n in names) {
      final el = lib.exportNamespace.definedNames2[n];
      if (el is ClassElement && el.isPublic && el.allSupertypes.any((s) => roots.contains(s.element)) && !errorTypes.contains(n)) {
        errorTypes.add(n);
      }
    }
  }

  String get tsBody {
    final b = StringBuffer();
    b.writeln('const m = createModule("$modName");');
    b.writeln();
    if (errorTypes.isNotEmpty) {
      b.writeln('/** `FuseError.type` values this package can produce itself (its exported exception classes). */');
      b.writeln('export type ${_cap(_camel(modName))}ErrorType = ${errorTypes.map((e) => '"$e"').join(' | ')};');
      b.writeln();
    }
    b.write(_ts);
    for (final e in _tsStatics.entries) {
      b.writeln('/** Static members of Dart `${e.key}`. */');
      b.writeln('export const ${e.key} = {');
      for (final l in e.value) {
        b.writeln('  ${l.trimLeft()}');
      }
      b.writeln('};');
      b.writeln();
    }
    return b.toString();
  }
}

String _camel(String s) => s.split('_').indexed.map((e) => e.$1 == 0 ? e.$2 : _cap(e.$2)).join();

extension ObjectFinish on Generator {
  /// Assembles one generated Dart library and one TS module from object and
  /// module emitters plus the shared codecs they requested.
  ({String dart, String ts, int codecLines}) finishObjects(
    String name, {
    required ObjectEmitter objects,
    ModuleEmitter? module,
    required String package,
    String tsSupport = '../fuse-objects',
  }) {
    final decOut = <String, String>{};
    final encOut = <String, String>{};
    final tsOutTypes = <String, String>{};
    final tsData = <String, String>{};
    var progress = true;
    while (progress) {
      progress = false;
      for (final e in _decoders.entries.toList()) {
        if (decOut.containsKey(e.key)) continue;
        decOut[e.key] = _emitDecoder(e.key, e.value);
        tsData[e.key] = _tsDataAlias(e.key, e.value);
        progress = true;
      }
      for (final e in _encoders.entries.toList()) {
        if (encOut.containsKey(e.key)) continue;
        encOut[e.key] = _emitEncoder(e.key, e.value);
        tsOutTypes[e.key] = _tsOutAlias(e.key, e.value);
        progress = true;
      }
    }
    final codecs = StringBuffer();
    codecs.writeln('// ── decoders (JSON -> Dart): arguments ──────────────────────────────────────\n');
    for (final k in decOut.keys.toList()..sort()) {
      codecs.writeln(decOut[k]);
    }
    codecs.writeln('// ── encoders (Dart -> JSON): results, mirrored state, events ────────────────\n');
    for (final k in encOut.keys.toList()..sort()) {
      codecs.writeln(encOut[k]);
    }
    final modBody = module?.dartBody ?? '';
    final cName = _cap(_camel(name));

    final dart = StringBuffer();
    dart.writeln('// GENERATED by tool/gen_objects.dart / tool/gen_module.dart from resolved Dart APIs. Do not edit.');
    dart.writeln('// ignore_for_file: type=lint, deprecated_member_use, unused_import, unused_element');
    final imports = {
      'dart:async': null,
      'package:flutter/material.dart': null,
      'package:solid_fuse/solid_fuse.dart': null,
      'package:$package/fuse_gen_support.dart': null,
      'package:$package/fuse_obj_support.dart': null,
      ..._imports,
    };
    for (final u in imports.keys.toList()..sort()) {
      if (u == 'dart:core') continue;
      dart.writeln(imports[u] == null ? "import '$u';" : "import '$u' as ${imports[u]};");
    }
    dart.writeln();
    dart.writeln('const _unset = Object();');
    dart.writeln();
    dart.writeln('/// Handle factories for objects JS can construct. Call before `runtime.start()`.');
    dart.writeln('void register${cName}Objects(FuseRuntime runtime) {');
    dart.writeln('  register${cName}Wrappers();');
    objects.registrations.where((r) => r.contains('registerHandle')).forEach(dart.writeln);
    dart.writeln('}');
    dart.writeln();
    dart.writeln('/// Wrap factories for objects Dart creates and hands to JS.');
    dart.writeln('void register${cName}Wrappers() {');
    objects.registrations.where((r) => !r.contains('registerHandle')).forEach(dart.writeln);
    dart.writeln('}');
    dart.writeln();
    if (modBody.isNotEmpty) dart.writeln(modBody);
    dart.write(objects.dart);
    dart.write(codecs);

    final shared = StringBuffer();
    shared.writeln('// ── enums ──');
    for (final k in _tsEnums.keys.toList()..sort()) {
      final el = _tsEnums[k]!;
      shared.write(docs == 'none' ? '' : _jsdoc(_docText(el.documentationComment, first: true), ''));
      shared.writeln('export type $k = ${el.constants.map((c) => '"${c.name}"').join(' | ')};');
    }
    shared.writeln('\n// ── records, JS -> Dart ──');
    for (final k in tsData.keys.toList()..sort()) {
      shared.writeln(tsData[k]);
    }
    shared.writeln('// ── records, Dart -> JS ──');
    for (final k in tsOutTypes.keys.toList()..sort()) {
      shared.writeln(tsOutTypes[k]);
    }
    final body = '${module?.tsBody ?? ''}${objects.ts}';
    final t = StringBuffer();
    t.writeln('// GENERATED by tool/gen_objects.dart / tool/gen_module.dart from resolved Dart APIs. Do not edit.');
    final sup = <String>[
      if (body.contains('createObject(')) 'createObject',
      if (body.contains('adoptObject(')) 'adoptObject',
      if (body.contains('createModule(')) 'createModule',
      if (body.contains('objRef(')) 'objRef',
      if (body.contains('ObjectRuntime<')) 'type ObjectRuntime',
      if (body.contains('ObjectRef')) 'type ObjectRef',
      if (body.contains('FuseObject<')) 'type FuseObject',
      if (body.contains('FuseStream<')) 'type FuseStream',
    ];
    if (body.contains('createSignal')) t.writeln('import { createSignal } from "solid-js";');
    if (body.contains('Handle<')) t.writeln('import type { Handle } from "solid-fuse/handle";');
    t.writeln('import { ${sup.join(', ')} } from "$tsSupport";');
    if (usesColorInput) t.writeln('import type { ColorInput } from "$tsSupport";');
    t.writeln();
    t.write(body);
    t.write(shared);
    return (dart: dart.toString(), ts: t.toString(), codecLines: '\n'.allMatches(codecs.toString()).length);
  }
}
