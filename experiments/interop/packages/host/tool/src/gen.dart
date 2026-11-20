// Part 2: emits (a) Dart adapters + codecs and (b) a .d.ts, both derived from
// the same classification as the survey.
import 'package:analyzer/dart/constant/value.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/nullability_suffix.dart';
import 'package:analyzer/dart/element/type.dart';

import 'classify.dart';
import 'objects.dart';
import 'overrides.dart';
import 'world.dart';

part 'objgen.dart';
part 'modgen.dart';

class WidgetReport {
  WidgetReport(this.component);
  final String component;
  String? skipped;
  int params = 0, emitted = 0;
  final Map<String, String> dropped = {};
  final List<String> notes = [];
  int dartLines = 0, tsBytes = 0;
  Map<String, Object?> toJson() => {
        'component': component,
        if (skipped != null) 'skipped': skipped,
        'params': params,
        'emitted': emitted,
        'dropped': dropped,
        'notes': notes,
        'dartLines': dartLines,
        'tsBytes': tsBytes,
      };
}

class Generator {
  Generator(this.w, this.c, {this.overrides = defaultOverrides, this.childrenHints = defaultChildrenHints, this.docs = 'first', this.tagPrefix = 'gen_'});
  final Map<String, String> childrenHints;
  final World w;
  final Classifier c;
  final List<CodecOverride> overrides;
  final String docs; // none | first | full
  final String tagPrefix;

  final _imports = <String, String?>{}; // uri -> prefix
  final _decoders = <String, InterfaceType>{}; // ident -> type (insertion ordered)
  final _encoders = <String, InterfaceType>{};
  final _tsEnums = <String, EnumElement>{};
  final _identOwner = <String, String>{}; // ident -> type key (collision check)
  final _dartWidgets = StringBuffer();
  final _tsWidgets = StringBuffer();
  final _registrations = <String>[];
  final reports = <WidgetReport>[];
  final warnings = <String>[];
  var usesColorInput = false;

  // ── naming / printing ────────────────────────────────────────────────────

  String ref(Element e) {
    final lib = w.importOf(e);
    if (lib == null) throw StateError('not importable: ${e.name}');
    if (lib.uri == 'dart:core') return e.name!;
    _imports[lib.uri] = lib.prefix;
    return lib.prefix == null ? e.name! : '${lib.prefix}.${e.name}';
  }

  /// Dart source for a type.
  String tc(DartType t) {
    final q = t.nullabilitySuffix == NullabilitySuffix.question ? '?' : '';
    if (t is DynamicType) return 'dynamic';
    if (t is VoidType) return 'void';
    if (t is TypeParameterType) return 'dynamic';
    if (t is InterfaceType) {
      final args = t.typeArguments.isEmpty ? '' : '<${t.typeArguments.map(tc).join(', ')}>';
      return '${ref(t.element)}$args$q';
    }
    if (t is FunctionType) {
      return '${tc(t.returnType)} Function(${t.formalParameters.where((p) => p.isPositional).map((p) => tc(p.type)).join(', ')})$q';
    }
    return 'dynamic';
  }

  DartType nn(DartType t) => w.ts.promoteToNonNull(t);
  bool nullable(DartType t) => t.nullabilitySuffix == NullabilitySuffix.question || t is DynamicType;

  String ident(DartType t) {
    final s = nn(t).getDisplayString();
    final id = s
        .replaceAll('?', 'N')
        .replaceAll('<', 'Of')
        .replaceAll(RegExp(r',\s*'), 'And')
        .replaceAll('>', '')
        .replaceAll(RegExp(r'[^A-Za-z0-9_]'), '_');
    final key = c.keyOf(t);
    final owner = _identOwner.putIfAbsent(id, () => key);
    if (owner != key) return _identOwner.entries.firstWhere((e) => e.value == key, orElse: () {
      final alt = '${id}_${_identOwner.length}';
      _identOwner[alt] = key;
      return MapEntry(alt, key);
    }).key;
    return id;
  }

  List<CodecOverride> _overridesFor(DataInfo d) {
    bool match(CodecOverride o, InterfaceElement e) {
      final lib = e.library.uri.toString();
      return o.type == e.name && (lib.startsWith('dart:') || lib.startsWith('package:flutter/'));
    }

    final out = <CodecOverride>[];
    for (final o in overrides) {
      if (match(o, d.type.element)) {
        out.add(o);
      } else if (o.inherit && d.variants.any((v) => match(o, v.type.element))) {
        out.add(o);
      } else if (o.inherit && w.subclassesOf(d.type.element).any((s) => match(o, s)) == false && d.type.element.allSupertypes.any((s) => match(o, s.element))) {
        // subclass of an overridden type (MaterialColor param): a nice Color is not a MaterialColor -> skip
      }
    }
    return out;
  }

  // ── JSON -> Dart ─────────────────────────────────────────────────────────

  /// Expression of type `T?` decoding [src].
  String dec(DartType t, String src) {
    final cls = c.classify(t);
    final base = nn(t);
    if (cls.coll != null && base is InterfaceType) {
      if (cls.coll == 'map') {
        final kt = base.typeArguments[0];
        final vt = base.typeArguments[1];
        final kc = c.classify(kt);
        final kf = kc.family == 'enum'
            ? '(k) => ${ref(kt.element!)}.values.byName(k)'
            : kc.sub == 'int'
                ? '(k) => int.parse(k)'
                : '(k) => k';
        return 'fuseMap<${tc(kt)}, ${tc(vt)}>($src, $kf, (e) => ${_elem(vt)})';
      }
      final et = base.typeArguments.first;
      final list = 'fuseList<${tc(et)}>($src, (e) => ${_elem(et)})';
      return cls.coll == 'set' ? '$list?.toSet()' : list;
    }
    switch (cls.family) {
      case 'primitive':
        return switch (cls.sub) {
          'bool' => 'decBool($src)',
          'int' => 'decInt($src)',
          'double' => 'decDouble($src)',
          'num' => 'decNum($src)',
          _ => 'decString($src)',
        };
      case 'enum':
        return 'fuseEnum(${ref(base.element!)}.values, $src)';
      case 'dynamic':
      case 'generic':
        return src;
      case 'data':
        final id = ident(base);
        _decoders.putIfAbsent(id, () => base as InterfaceType);
        return 'dec$id($src)';
    }
    throw StateError('dec: unsupported ${cls.label} for ${t.getDisplayString()}');
  }

  String _elem(DartType et) {
    final e = dec(et, 'e');
    final cls = c.classify(et);
    if (cls.family == 'dynamic' || cls.family == 'generic') return e;
    return nullable(et) ? e : '$e!';
  }

  /// Argument expression for a parameter decoded from [src]; null if the
  /// parameter cannot be emitted (non-null default not reproducible).
  String? argExpr(P p, String src, String owner) {
    final e = dec(p.type, src);
    final cls = c.classify(p.type);
    if (hasDefault(p.el)) {
      final d = defaultCode(p.el);
      if (d == null) return null;
      if (d == 'null') return e;
      return '$e ?? $d';
    }
    if (p.nullable || ((cls.family == 'dynamic' || cls.family == 'generic') && cls.coll == null)) return e;
    if (p.mustSupply) return "fuseReq($e, '$owner', '${p.name}')";
    return null;
  }

  // ── const default regeneration ───────────────────────────────────────────

  /// The parameter a redirecting factory's parameter forwards to. Redirecting
  /// factories (`const factory EdgeInsetsGeometry.only({double left, ...}) =
  /// EdgeInsets.only;`) declare no defaults of their own.
  FormalParameterElement? _redirectTarget(FormalParameterElement p) {
    final ctor = p.baseElement.enclosingElement;
    if (ctor is! ConstructorElement) return null;
    final target = ctor.redirectedConstructor;
    if (target == null) return null;
    final own = ctor.formalParameters;
    final theirs = target.formalParameters;
    if (p.isNamed) return theirs.where((t) => t.isNamed && t.name == p.name).firstOrNull;
    final i = own.where((x) => x.isPositional).toList().indexWhere((x) => x.name == p.name);
    final pos = theirs.where((x) => x.isPositional).toList();
    return i >= 0 && i < pos.length ? pos[i] : null;
  }

  bool hasDefault(FormalParameterElement p) {
    final t = _redirectTarget(p);
    if (t != null) return hasDefault(t);
    return p.hasDefaultValue;
  }

  String? defaultCode(FormalParameterElement p) {
    final base = p.baseElement;
    final rt = _redirectTarget(p);
    if (rt != null) return hasDefault(rt) ? defaultCode(rt) : (p.type.nullabilitySuffix == NullabilitySuffix.question ? 'null' : null);
    final v = base.computeConstantValue();
    if (v == null) return null;
    try {
      return constCode(v);
    } catch (_) {
      return null;
    }
  }

  String constCode(DartObject o, {bool inConst = false}) {
    if (o.isNull) return 'null';
    final t = o.type;
    final variable = o.variable;
    if (variable is FieldElement && variable.isStatic && variable.isPublic) {
      final owner = variable.enclosingElement;
      if (owner.isPublic && w.isExported(owner)) return '${ref(owner)}.${variable.name}';
    }
    if (variable is TopLevelVariableElement && variable.isPublic && w.isExported(variable)) {
      return ref(variable);
    }
    if (t == null) throw 'no type';
    if (t.isDartCoreBool) return '${o.toBoolValue()!}';
    if (t.isDartCoreInt) return '${o.toIntValue()!}';
    if (t.isDartCoreDouble) {
      final d = o.toDoubleValue()!;
      if (d.isNaN) return 'double.nan';
      if (d.isInfinite) return d > 0 ? 'double.infinity' : 'double.negativeInfinity';
      return '$d';
    }
    if (t.isDartCoreString) {
      return "'${o.toStringValue()!.replaceAll(r'\', r'\\').replaceAll("'", r"\'").replaceAll(r'$', r'\$').replaceAll('\n', r'\n')}'";
    }
    final el = t.element;
    if (el is EnumElement) {
      final idx = o.getField('index')?.toIntValue();
      if (idx != null && w.isExported(el)) return '${ref(el)}.${el.constants[idx].name}';
      throw 'enum';
    }
    final k = inConst ? '' : 'const ';
    final list = o.toListValue();
    if (list != null) {
      return '$k<${tc((t as InterfaceType).typeArguments.first)}>[${list.map((e) => constCode(e, inConst: true)).join(', ')}]';
    }
    final set = o.toSetValue();
    if (set != null) {
      return '$k<${tc((t as InterfaceType).typeArguments.first)}>{${set.map((e) => constCode(e, inConst: true)).join(', ')}}';
    }
    final map = o.toMapValue();
    if (map != null) {
      final ta = (t as InterfaceType).typeArguments;
      return '$k<${tc(ta[0])}, ${tc(ta[1])}>{${map.entries.map((e) => '${constCode(e.key!, inConst: true)}: ${constCode(e.value!, inConst: true)}').join(', ')}}';
    }
    final fn = o.toFunctionValue();
    if (fn != null) {
      final owner = fn.enclosingElement;
      if (fn.isPublic && owner is InterfaceElement && w.isExported(owner)) return '${ref(owner)}.${fn.name}';
      if (fn.isPublic && w.isExported(fn)) return ref(fn);
      throw 'private function';
    }
    final inv = o.constructorInvocation;
    if (inv != null && t is InterfaceType) {
      final ctor = inv.constructor;
      if (ctor.isPrivate || !w.isExported(t.element) || t.element.isPrivate) throw 'private ctor';
      final name = (ctor.name == null || ctor.name == 'new') ? '' : '.${ctor.name}';
      final args = [
        ...inv.positionalArguments.map((a) => constCode(a, inConst: true)),
        ...inv.namedArguments.entries.map((e) => '${e.key}: ${constCode(e.value, inConst: true)}'),
      ];
      final ta = t.typeArguments.isEmpty ? '' : '<${t.typeArguments.map(tc).join(', ')}>';
      return '$k${ref(t.element)}$ta$name(${args.join(', ')})';
    }
    throw 'unsupported const';
  }

  /// TS literal for a default, when it is one.
  String? tsDefault(FormalParameterElement p) {
    final v = p.baseElement.computeConstantValue();
    if (v == null || v.isNull) return null;
    final t = v.type;
    if (t == null) return null;
    if (t.isDartCoreBool) return '${v.toBoolValue()}';
    if (t.isDartCoreInt) return '${v.toIntValue()}';
    if (t.isDartCoreDouble) {
      final d = v.toDoubleValue()!;
      return d.isFinite ? (d == d.roundToDouble() ? '${d.toInt()}' : '$d') : (d.isNaN ? 'NaN' : (d > 0 ? 'Infinity' : '-Infinity'));
    }
    if (t.isDartCoreString) return '"${v.toStringValue()}"';
    final el = t.element;
    if (el is EnumElement) {
      final idx = v.getField('index')?.toIntValue();
      if (idx != null) return '"${el.constants[idx].name}"';
    }
    final code = p.defaultValueCode;
    return code == null ? null : 'Dart `${code.replaceAll(RegExp(r'\s+'), ' ')}`';
  }

  // ── data decoders ────────────────────────────────────────────────────────

  String _ctorCall(Variant v, String owner) {
    final name = (v.ctor.name == null || v.ctor.name == 'new') ? '' : '.${v.ctor.name}';
    final ta = v.type.typeArguments.isEmpty ? '' : '<${v.type.typeArguments.map(tc).join(', ')}>';
    final pos = <String>[];
    final named = <String>[];
    var cut = false;
    for (final p in v.ctor.formalParameters) {
      final pp = v.params.where((x) => x.name == p.name).firstOrNull;
      String? e;
      if (pp != null && !cut) e = argExpr(pp, "m['${pp.name}']", owner);
      if (e == null) {
        if (pp != null) warnings.add('$owner.${p.name}: default not reproducible, param dropped');
        if (p.isRequired) {
          if (p.isPositional) {
            pos.add('null');
          } else {
            named.add('${p.name}: null');
          }
        } else if (p.isOptionalPositional) {
          cut = true;
        }
        continue;
      }
      if (p.isPositional) {
        pos.add(e);
      } else {
        named.add('${p.name}: $e');
      }
    }
    return '${ref(v.type.element)}$ta$name(${[...pos, ...named].join(', ')})';
  }

  String _emitDecoder(String id, InterfaceType t) {
    final d = c.classify(t).data!;
    final b = StringBuffer();
    final tn = tc(t);
    final ovs = _overridesFor(d);
    b.writeln('$tn? dec$id(Object? v) {');
    b.writeln('  if (v == null) return null;');
    for (final o in ovs) {
      b.writeln('  final n${o.type} = ${o.decode}(v);');
      b.writeln('  if (n${o.type} != null) return n${o.type};');
    }
    if (!ovs.any((o) => o.replace)) {
      if (d.consts.isNotEmpty) {
        b.writeln('  if (v is String) {');
        b.writeln('    return switch (v) {');
        for (final k in d.consts) {
          b.writeln("      '${k.label}' => ${ref(k.owner)}.${k.field.name},");
        }
        b.writeln("      _ => fuseBad('$tn', v),");
        b.writeln('    };');
        b.writeln('  }');
      }
      if (d.variants.isNotEmpty) {
        b.writeln('  final m = v as Map;');
        b.writeln("  switch (m[r'\$']) {");
        for (final v in d.variants) {
          final owner = '${v.type.element.name}${v.tag == null ? '' : '.${v.tag!.split('.').last}'}';
          b.writeln('    case ${v.tag == null ? 'null' : "'${v.tag}'"}:');
          b.writeln('      return ${_ctorCall(v, owner)};');
        }
        b.writeln('  }');
      }
    }
    b.writeln("  return fuseBad('$tn', v);");
    b.writeln('}');
    return b.toString();
  }

  // ── Dart -> JSON (callback payloads) ─────────────────────────────────────

  String enc(DartType t, Enc e, String src) {
    final q = nullable(t);
    switch (e.kind) {
      case 'prim':
      case 'generic':
        return src;
      case 'double':
        return 'fuseNum($src)';
      case 'enum':
        return q ? '$src?.name' : '$src.name';
      case 'coll':
        final et = _iterArg(t);
        return '$src${q ? '?' : ''}.map((e) => ${enc(et, e.elem!, 'e')}).toList()';
      case 'map':
        final mt = nn(t) as InterfaceType;
        final kx = mt.typeArguments[0].element is EnumElement ? 'k.name' : 'k';
        return '$src${q ? '?' : ''}.map((k, e) => MapEntry($kx, ${enc(mt.typeArguments[1], e.elem!, 'e')}))';
      case 'class':
        final o = _encOverride(nn(t) as InterfaceType);
        if (o != null) return '${o.encode}($src)';
        final id = ident(t);
        _encoders.putIfAbsent(id, () => nn(t) as InterfaceType);
        return 'enc$id($src)';
    }
    return 'null';
  }

  DartType _iterArg(DartType t) =>
      (nn(t) as InterfaceType).asInstanceOf(w.material.typeProvider.iterableElement)!.typeArguments.first;

  CodecOverride? _encOverride(InterfaceType t) {
    final lib = t.element.library.uri.toString();
    if (!(lib.startsWith('dart:') || lib.startsWith('package:flutter/'))) return null;
    return overrides.where((o) => o.encode != null && o.type == t.element.name).firstOrNull;
  }

  String _emitEncoder(String id, InterfaceType t) {
    final e = c.encodable(t);
    final b = StringBuffer();
    b.writeln('Map<String, Object?>? enc$id(${tc(t)}? v) => v == null');
    b.writeln('    ? null');
    b.writeln('    : {');
    for (final (n, ft, fe) in e.fields) {
      b.writeln("        '$n': ${enc(ft, fe, 'v.$n')},");
    }
    b.writeln('      };');
    return b.toString();
  }

  // ── TS types ─────────────────────────────────────────────────────────────

  String ts(DartType t) {
    final cls = c.classify(t);
    final base = nn(t);
    if (cls.coll != null && base is InterfaceType) {
      if (cls.coll == 'map') {
        final kc = c.classify(base.typeArguments[0]);
        final k = kc.family == 'enum' ? ts(base.typeArguments[0]) : 'string';
        return 'Partial<Record<$k, ${_tsElem(base.typeArguments[1])}>>';
      }
      final e = _tsElem(base.typeArguments.first);
      return e.contains(' ') || e.contains('|') ? '($e)[]' : '$e[]';
    }
    switch (cls.family) {
      case 'primitive':
        return switch (cls.sub) { 'bool' => 'boolean', 'String' => 'string', _ => 'number' };
      case 'enum':
        final el = base.element as EnumElement;
        _tsEnums[el.name!] = el;
        return el.name!;
      case 'dynamic':
      case 'generic':
        return 'unknown';
      case 'data':
        final id = ident(base);
        _decoders.putIfAbsent(id, () => base as InterfaceType);
        return id;
      case 'widget':
        return 'FuseElement';
      case 'handle':
        return 'FuseHandle<"${base.getDisplayString()}">';
      case 'callback':
        return _tsCallback(cls.cb!);
    }
    return 'never';
  }

  String _tsElem(DartType t) => nullable(t) && t is! DynamicType ? '${ts(t)} | null' : ts(t);

  String _tsCallback(CbInfo cb) {
    final real = cb.args.where((a) => a.enc.kind != 'context').toList();
    if (real.isEmpty) return '() => void';
    String one(CbArg a) => tsOut(a.type, a.enc) + (nullable(a.type) && a.enc.kind != 'generic' ? ' | null' : '');
    if (real.length == 1) return '(${real[0].name}: ${one(real[0])}) => void';
    return '(args: [${real.map((a) => '${a.name}: ${one(a)}').join(', ')}]) => void';
  }

  String tsOut(DartType t, Enc e) {
    switch (e.kind) {
      case 'prim':
        final b = nn(t);
        return b.isDartCoreBool ? 'boolean' : b.isDartCoreString ? 'string' : 'number';
      case 'double':
        return 'number';
      case 'enum':
        final el = nn(t).element as EnumElement;
        _tsEnums[el.name!] = el;
        return el.name!;
      case 'generic':
        return 'unknown';
      case 'coll':
        final et = _iterArg(t);
        final s = tsOut(et, e.elem!);
        return nullable(et) ? '($s | null)[]' : '$s[]';
      case 'map':
        final vt = (nn(t) as InterfaceType).typeArguments[1];
        return 'Record<string, ${tsOut(vt, e.elem!)}${nullable(vt) && e.elem!.kind != 'generic' ? ' | null' : ''}>';
      case 'class':
        final o = _encOverride(nn(t) as InterfaceType);
        if (o != null) return o.tsOut!;
        final id = ident(t);
        _encoders.putIfAbsent(id, () => nn(t) as InterfaceType);
        return '${id}Out';
    }
    return 'null';
  }

  String _tsDataAlias(String id, InterfaceType t) {
    final d = c.classify(t).data!;
    final arms = <String>[];
    final ovs = _overridesFor(d);
    for (final o in ovs) {
      arms.add(o.tsIn);
      if (o.tsIn == 'ColorInput') usesColorInput = true;
    }
    if (!ovs.any((o) => o.replace)) {
      if (d.consts.isNotEmpty) {
        // chunk literal unions to keep lines readable
        final lits = d.consts.map((k) => '"${k.label}"').toList();
        for (var i = 0; i < lits.length; i += 8) {
          arms.add(lits.skip(i).take(8).join(' | '));
        }
      }
      for (final v in d.variants) {
        final fields = <String>[];
        if (v.tag != null) fields.add('\$: "${v.tag}"');
        for (final p in v.params) {
          final cls = c.classify(p.type);
          final optional = !p.mustSupply || cls.family == 'dynamic' || cls.family == 'generic';
          // skip params whose default could not be regenerated
          if (hasDefault(p.el) && defaultCode(p.el) == null) continue;
          if (!hasDefault(p.el) && !p.nullable && !p.mustSupply && cls.family != 'dynamic' && cls.family != 'generic') continue;
          fields.add('${_tsProp(p.name)}${optional ? '?' : ''}: ${ts(p.type)}${p.nullable && cls.coll == null && cls.family != 'dynamic' && cls.family != 'generic' ? ' | null' : ''}');
        }
        arms.add(fields.isEmpty ? '{}' : '{ ${fields.join('; ')} }');
      }
    }
    final doc = docs == 'none' ? '' : _jsdoc(_docText(t.element.documentationComment, first: true), '', extra: ['Dart: `${t.getDisplayString()}`']);
    return '${doc}export type $id =\n${arms.map((a) => '  | $a').join('\n')};\n';
  }

  String _tsProp(String n) => RegExp(r'^[A-Za-z_$][A-Za-z0-9_$]*$').hasMatch(n) ? n : '"$n"';

  String _tsOutAlias(String id, InterfaceType t) {
    final e = c.encodable(t);
    final b = StringBuffer('/** Callback payload derived from Dart `${t.getDisplayString()}`. */\nexport interface ${id}Out {\n');
    for (final (n, ft, fe) in e.fields) {
      b.writeln('  $n: ${tsOut(ft, fe)}${nullable(ft) && fe.kind != 'generic' ? ' | null' : ''};');
    }
    b.writeln('}');
    return b.toString();
  }

  // ── docs ─────────────────────────────────────────────────────────────────

  String? _docText(String? raw, {bool first = false}) {
    if (raw == null) return null;
    var lines = raw.split('\n').map((l) => l.replaceFirst(RegExp(r'^\s*///? ?'), '')).toList();
    final out = <String>[];
    var skip = false;
    for (final l in lines) {
      if (l.contains('{@tool')) skip = true;
      if (!skip && !RegExp(r'^\s*\{@(template|endtemplate|macro|youtube|animation|category|subCategory)').hasMatch(l)) out.add(l);
      if (l.contains('{@end-tool}')) skip = false;
    }
    var text = out.join('\n').trim();
    if (first || docs == 'first') {
      final i = text.indexOf('\n\n');
      if (i > 0) text = text.substring(0, i);
    }
    text = text.replaceAll('*/', '*\\/');
    return text.isEmpty ? null : text;
  }

  String _jsdoc(String? text, String indent, {List<String> extra = const []}) {
    final lines = [...?text?.split('\n'), if (text != null && extra.isNotEmpty) '', ...extra];
    if (lines.isEmpty) return '';
    if (lines.length == 1) return '$indent/** ${lines[0]} */\n';
    return '$indent/**\n${lines.map((l) => '$indent * $l'.trimRight()).join('\n')}\n$indent */\n';
  }

  String? _paramDoc(FormalParameterElement p, InterfaceType owner) {
    final b = p.baseElement;
    if (b is FieldFormalParameterElement) {
      final d = b.field?.documentationComment;
      if (d != null) return d;
    }
    if (b is SuperFormalParameterElement) {
      final s = b.superConstructorParameter;
      if (s != null) {
        final d = _paramDoc(s, owner);
        if (d != null) return d;
      }
    }
    final g = owner.lookUpGetter(p.name ?? '', w.material, inherited: false) ?? owner.lookUpGetter(p.name ?? '', w.material, inherited: true);
    return g?.documentationComment ?? g?.variable.documentationComment;
  }

  // ── widgets ──────────────────────────────────────────────────────────────

  /// [spec] is `Class` or `Class.ctor`.
  void addWidget(String spec, {String? libUri}) {
    final parts = spec.split('.');
    final cname = parts[0];
    final ctorName = parts.length > 1 ? parts[1] : 'new';
    Element? el;
    for (final e in w.entries) {
      if (libUri != null && e.uri != libUri) continue;
      el = e.element.exportNamespace.get2(cname);
      if (el != null) break;
    }
    var component = cname + (ctorName == 'new' ? '' : ctorName[0].toUpperCase() + ctorName.substring(1));
    // Positioned.directional vs class PositionedDirectional
    if (ctorName != 'new' && w.entries.any((e) => e.element.exportNamespace.get2(component) != null)) component = '${component}Ctor';
    final rep = WidgetReport(component);
    reports.add(rep);
    if (el is! ClassElement) {
      rep.skipped = 'class not found';
      return;
    }
    final type = w.ts.instantiateInterfaceToBounds(element: el, nullabilitySuffix: NullabilitySuffix.none);
    final ctor = type.constructors.where((k) => (k.name ?? 'new') == ctorName).firstOrNull;
    if (ctor == null || ctor.isPrivate) {
      rep.skipped = 'constructor not found';
      return;
    }
    if (type.typeArguments.isNotEmpty) {
      rep.notes.add('generic class instantiated to bounds: ${type.getDisplayString()}');
    }
    final params = ctor.formalParameters;
    rep.params = params.length;
    final hint = childrenHints[cname];
    final hasChild = hint != null || params.any((p) => (p.name == 'child' || p.name == 'children') && c.classify(p.type).family == 'widget');
    final pos = <String>[];
    final named = <String>[];
    final tsProps = <String>[];
    var acceptsChildren = false;
    var textRule = false;

    for (final p in params) {
      final cls = c.classify(p.type);
      final pp = P(p, p.type, cls);
      final name = pp.name;
      final src = "p['$name']";
      String? expr;
      String? tsT;
      var tsOptional = !pp.mustSupply;
      String? drop;

      if (p.metadata.hasDeprecated) {
        drop = 'deprecated';
      } else if (cls.family == 'key') {
        drop = name == 'key' ? 'key (FuseNodeWidget already keys by node id)' : 'key';
      } else if (cls.family == 'widget' && cls.ok) {
        if (cls.sub == 'preferredSize' && cls.coll == null) {
          expr = "fusePreferredSize(node, '$name')";
          tsT = 'FuseElement';
          rep.notes.add('$name: PreferredSizeWidget slot wrapped in PreferredSize (fixed height hack)');
          if (pp.mustSupply) expr = "fuseReq($expr, '$component', '$name')";
        } else if (cls.coll == null && (name == 'child' || name == hint)) {
          expr = pp.nullable ? 'fuseChild(node)' : 'fuseChild(node) ?? const SizedBox.shrink()';
          acceptsChildren = true;
        } else if (cls.coll == 'list' && (name == 'children' || name == hint)) {
          expr = 'node.childWidgets';
          acceptsChildren = true;
        } else if (cls.coll == null) {
          expr = pp.nullable ? "node.widget('$name')" : "node.widget('$name') ?? const SizedBox.shrink()";
          tsT = 'FuseElement';
          if (!pp.nullable && !p.hasDefaultValue) tsOptional = false;
        } else if (cls.coll == 'list') {
          expr = "fuseWidgetList(node, '$name')";
          if (!pp.nullable) expr = '$expr ?? const <Widget>[]';
          tsT = 'FuseElement | FuseElement[]';
          tsOptional = true;
          rep.notes.add('$name: List<Widget> prop needs the renderer to resolve node refs inside arrays');
        } else {
          drop = 'widget collection (${cls.coll})';
        }
      } else if (cls.family == 'callback' && cls.ok && cls.coll == null) {
        final cb = cls.cb!;
        final real = <(int, CbArg)>[];
        for (var i = 0; i < cb.args.length; i++) {
          if (cb.args[i].enc.kind != 'context') real.add((i, cb.args[i]));
        }
        final argList = [for (var i = 0; i < cb.args.length; i++) 'a$i'].join(', ');
        if (cb.args.isEmpty && !pp.mustSupply) {
          expr = "node.callback('$name')";
        } else {
          final payload = real.isEmpty
              ? ''
              : real.length == 1
                  ? ', ${enc(real[0].$2.type, real[0].$2.enc, 'a${real[0].$1}')}'
                  : ', [${real.map((r) => enc(r.$2.type, r.$2.enc, 'a${r.$1}')).join(', ')}]';
          final call = "node.callFunction(node.id, '$name'$payload)";
          expr = pp.mustSupply || !pp.nullable
              ? "($argList) { if ($src == true) $call; }"
              : "$src != true ? null : ($argList) => $call";
          if (real.length > 1) rep.notes.add('$name: ${real.length} callback args cross as one array payload');
        }
        tsT = _tsCallback(cb);
        if (!pp.nullable) tsOptional = true;
      } else if (cls.family == 'handle' && cls.coll == null) {
        expr = "node.handle<${tc(nn(p.type))}>('$name')";
        if (pp.mustSupply) expr = "fuseReq($expr, '$component', '$name')";
        if (!pp.nullable && !pp.mustSupply) drop = 'handle with non-null default';
        tsT = ts(p.type);
      } else if (cls.ok && const {'primitive', 'enum', 'data', 'dynamic', 'generic'}.contains(cls.family)) {
        // Text content rule: first required positional String, no child slot.
        if (p.isRequiredPositional && nn(p.type).isDartCoreString && !hasChild && params.first == p) {
          expr = '${dec(p.type, src)} ?? fuseText(node)';
          tsOptional = true;
          textRule = true;
          acceptsChildren = true;
          rep.notes.add('$name: positional String is filled from text children when the prop is absent');
        } else {
          expr = argExpr(pp, src, component);
          if (expr == null) drop = 'default value not reproducible (${p.defaultValueCode})';
        }
        tsT = ts(p.type);
        if (cls.family == 'dynamic' || cls.family == 'generic') tsOptional = !p.isRequired;
        if (cls.partial) rep.notes.add('$name: data type ${nn(p.type).getDisplayString()} has dropped optional ctor params');
      } else {
        drop = cls.label;
      }

      if (drop != null) {
        if (pp.mustSupply) {
          rep.skipped = 'required param `$name` (${p.type.getDisplayString()}) is not bridgeable: $drop';
          return;
        }
        if (!(name == 'key' && cls.family == 'key')) rep.dropped[name] = drop;
        if (p.isRequired) {
          if (p.isPositional) {
            pos.add('null');
          } else {
            named.add('$name: null');
          }
        }
        continue;
      }
      rep.emitted++;
      if (p.isPositional) {
        pos.add(expr!);
      } else {
        named.add('$name: ${expr!}');
      }
      if (tsT != null) {
        final dflt = p.hasDefaultValue ? tsDefault(p) : null;
        final doc = docs == 'none' ? '' : _jsdoc(_docText(_paramDoc(p, type)), '  ', extra: [if (dflt != null) '@default $dflt']);
        final nullish = pp.nullable && p.isRequired;
        final tsFull = !nullish ? tsT : (tsT.contains('=>') ? '($tsT) | null' : '$tsT | null');
        tsProps.add('$doc  ${_tsProp(name)}${tsOptional ? '?' : ''}: $tsFull;');
      }
    }

    final dartName = 'FuseGen$component';
    final ctorSuffix = ctorName == 'new' ? '' : '.$ctorName';
    final ta = type.typeArguments.isEmpty ? '' : '<${type.typeArguments.map(tc).join(', ')}>';
    final d = StringBuffer();
    d.writeln('/// Generated adapter for [${ref(el)}$ctorSuffix].');
    if (rep.dropped.isNotEmpty) {
      d.writeln('///');
      d.writeln('/// Not bridged: ${rep.dropped.entries.map((e) => '`${e.key}` (${e.value})').join(', ')}.');
    }
    d.writeln('class $dartName extends StatelessWidget {');
    d.writeln('  const $dartName(this.node, {super.key});');
    d.writeln('  final FuseNode node;');
    d.writeln();
    d.writeln('  @override');
    d.writeln('  Widget build(BuildContext context) {');
    final usesP = [...pos, ...named].any((e) => e.contains("p['"));
    if (usesP) d.writeln('    final p = node.props;');
    d.writeln('    return ${ref(el)}$ta$ctorSuffix(');
    for (final a in [...pos, ...named]) {
      d.writeln('      $a,');
    }
    d.writeln('    );');
    d.writeln('  }');
    d.writeln('}');
    rep.dartLines = '\n'.allMatches(d.toString()).length;
    _dartWidgets.writeln(d);
    final tag = '$tagPrefix$component';
    _registrations.add("  runtime.registerWidget('$tag', $dartName.new);");

    final t = StringBuffer();
    final classDoc = docs == 'none' ? '' : _jsdoc(_docText(el.documentationComment), '', extra: ['Flutter: `${el.name}$ctorSuffix` (intrinsic `<$tag>`)']);
    t.write(classDoc);
    t.writeln('export interface ${component}Props extends FuseGenBaseProps {');
    if (acceptsChildren) {
      t.writeln(textRule ? '  children?: FuseText;' : '  children?: FuseChildren;');
      // Expanded/Flexible have their own `flex` (int): the Flutter param wins.
      final ownFlex = params.any((p) => p.name == 'flex');
      if (ownFlex) rep.notes.add('flex: collides with solid-fuse\'s `flex` layout prop; the Flutter parameter wins');
      if (!textRule && !ownFlex && params.any((p) => (p.name == 'child' || p.name == hint) && c.classify(p.type).coll == null)) {
        t.writeln('  /** solid-fuse layout convention applied when more than one child is given. */');
        t.writeln('  flex?: FuseFlex;');
      }
    }
    for (final l in tsProps) {
      t.writeln(l);
    }
    t.writeln('}');
    t.writeln('export declare function $component(props: ${component}Props): FuseElement;');
    rep.tsBytes = t.length;
    _tsWidgets.writeln(t);
  }

  // ── output ───────────────────────────────────────────────────────────────

  ({String dart, String ts, int codecLines, int tsSharedBytes}) finish(String name) {
    // Emit codecs to a fixpoint (emitting one may request more).
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
    codecs.writeln('// ── decoders (JSON -> Dart), one per data type ───────────────────────────────\n');
    for (final k in decOut.keys.toList()..sort()) {
      codecs.writeln(decOut[k]);
    }
    codecs.writeln('// ── encoders (Dart -> JSON), callback payloads ───────────────────────────────\n');
    for (final k in encOut.keys.toList()..sort()) {
      codecs.writeln(encOut[k]);
    }

    final dart = StringBuffer();
    dart.writeln('// GENERATED by tool/generate.dart from resolved Dart APIs. Do not edit.');
    dart.writeln('// ignore_for_file: type=lint, deprecated_member_use');
    final imports = {
      'package:flutter/material.dart': null,
      'package:solid_fuse/solid_fuse.dart': null,
      'package:fuse_gen_spike/fuse_gen_support.dart': null,
      ..._imports,
    };
    final uris = imports.keys.toList()..sort();
    for (final u in uris) {
      if (u == 'dart:core') continue;
      dart.writeln(imports[u] == null ? "import '$u';" : "import '$u' as ${imports[u]};");
    }
    dart.writeln();
    dart.writeln('void register${name[0].toUpperCase()}${name.substring(1)}Widgets(FuseRuntime runtime) {');
    _registrations.forEach(dart.writeln);
    dart.writeln('}');
    dart.writeln();
    dart.write(_dartWidgets);
    dart.write(codecs);

    final t = StringBuffer();
    t.writeln('// GENERATED by tool/generate.dart from resolved Dart APIs. Do not edit.');
    t.writeln('import type { FuseElement, FuseChildren, FuseText, FuseFlex, FuseHandle, FuseGenBaseProps${usesColorInput ? ', ColorInput' : ''} } from "./fuse-gen-base";');
    t.writeln();
    t.write(_tsWidgets);
    final shared = StringBuffer();
    shared.writeln('// ── enums ──');
    for (final k in _tsEnums.keys.toList()..sort()) {
      final el = _tsEnums[k]!;
      shared.write(docs == 'none' ? '' : _jsdoc(_docText(el.documentationComment, first: true), ''));
      shared.writeln('export type $k = ${el.constants.map((c) => '"${c.name}"').join(' | ')};');
    }
    shared.writeln('\n// ── data types (JS -> Dart) ──');
    for (final k in tsData.keys.toList()..sort()) {
      shared.writeln(tsData[k]);
    }
    shared.writeln('// ── callback payloads (Dart -> JS) ──');
    for (final k in tsOutTypes.keys.toList()..sort()) {
      shared.writeln(tsOutTypes[k]);
    }
    // enums may have been requested while emitting data aliases
    t.write(shared);
    return (
      dart: dart.toString(),
      ts: t.toString(),
      codecLines: '\n'.allMatches(codecs.toString()).length,
      tsSharedBytes: shared.length,
    );
  }

  /// Coverage inside the data classes that were emitted: constructor
  /// parameters kept vs dropped (by reason), and constructors rejected.
  Map<String, Object?> dataStats() {
    var kept = 0, dropped = 0, variants = 0, rejected = 0, consts = 0;
    final reasons = <String, int>{};
    final examples = <String, List<String>>{};
    final rejectedWhy = <String, String>{};
    for (final e in _decoders.entries) {
      final d = c.classify(e.value).data!;
      variants += d.variants.length;
      consts += d.consts.length;
      rejected += d.rejected.length;
      d.rejected.forEach((k, v) => rejectedWhy['${e.key}.$k'] = v);
      for (final v in d.variants) {
        kept += v.params.length;
        dropped += v.dropped.length;
        v.dropped.forEach((n, why) {
          reasons[why] = (reasons[why] ?? 0) + 1;
          final ex = examples[why] ??= [];
          if (ex.length < 6) ex.add('${v.type.element.name}${v.tag == null ? '' : '(${v.tag})'}.$n');
        });
      }
    }
    return {
      'types': _decoders.length,
      'ctorVariants': variants,
      'staticConsts': consts,
      'ctorParamsKept': kept,
      'ctorParamsDropped': dropped,
      'droppedByReason': Map.fromEntries(reasons.entries.toList()..sort((a, b) => b.value.compareTo(a.value))),
      'droppedExamples': examples,
      'ctorsRejected': rejected,
      'ctorsRejectedWhy': rejectedWhy,
    };
  }

  int get decoderCount => _decoders.length;
  int get encoderCount => _encoders.length;
  int get enumCount => _tsEnums.length;
}
