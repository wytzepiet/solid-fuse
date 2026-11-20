// Emits (a) Dart adapters + codecs and (b) a JSON manifest describing every
// widget, prop, data type, enum and callback payload. Everything that is not
// Dart (TS wrappers, dev validators, catalogue, lock hash) is produced from
// the manifest by the CLI (cli/gen-emit.ts), never from the analyzer.
import 'package:analyzer/dart/constant/value.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/nullability_suffix.dart';
import 'package:analyzer/dart/element/type.dart';

import 'classify.dart';
import 'overrides.dart';
import 'world.dart';

class WidgetReport {
  WidgetReport(this.component);
  final String component;
  String? skipped;
  int params = 0, emitted = 0;
  final Map<String, String> dropped = {};
  final List<String> notes = [];
  int dartLines = 0;
  Map<String, Object?> toJson() => {
        'component': component,
        if (skipped != null) 'skipped': skipped,
        'params': params,
        'emitted': emitted,
        'dropped': dropped,
        'notes': notes,
        'dartLines': dartLines,
      };
}

class Generator {
  Generator(this.w, this.c, {this.overrides = defaultOverrides, this.childrenHints = defaultChildrenHints, this.docs = 'first', required this.unit, this.supportImport = 'package:solid_fuse/gen_support.dart'});

  /// Unit name: `flutter`, `app`, or a pub package name. Wire tags are
  /// `<unit>.<Component>`, which cannot collide across packages.
  final String unit;
  final String supportImport;
  final mWidgets = <String, Map<String, Object?>>{};
  final mSkipped = <String, String>{};
  final Map<String, String> childrenHints;
  final World w;
  final Classifier c;
  final List<CodecOverride> overrides;
  final String docs; // none | first | full

  final _imports = <String, String?>{}; // uri -> prefix
  final _decoders = <String, InterfaceType>{}; // ident -> type (insertion ordered)
  final _encoders = <String, InterfaceType>{};
  final _tsEnums = <String, EnumElement>{};
  final _identOwner = <String, String>{}; // ident -> type key (collision check)
  final _dartWidgets = StringBuffer();
  final _registrations = <String>[];
  final reports = <WidgetReport>[];
  final warnings = <String>[];

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

  // ── manifest types ───────────────────────────────────────────────────────

  /// Manifest type descriptor for a JS -> Dart value.
  Map<String, Object?> mt(DartType t) {
    final cls = c.classify(t);
    final base = nn(t);
    if (cls.coll != null && base is InterfaceType) {
      if (cls.coll == 'map') {
        final kt = base.typeArguments[0];
        final kc = c.classify(kt);
        return {'k': 'map', 'key': kc.family == 'enum' ? mt(kt) : {'k': 'string'}, 'v': _mElem(base.typeArguments[1])};
      }
      return {'k': 'list', 'e': _mElem(base.typeArguments.first)};
    }
    switch (cls.family) {
      case 'primitive':
        return {
          'k': switch (cls.sub) { 'bool' => 'bool', 'String' => 'string', 'int' => 'int', 'double' => 'double', _ => 'num' }
        };
      case 'enum':
        final el = base.element as EnumElement;
        _tsEnums[el.name!] = el;
        return {'k': 'enum', 'n': el.name!};
      case 'dynamic':
      case 'generic':
        return {'k': 'unknown'};
      case 'data':
        final id = ident(base);
        _decoders.putIfAbsent(id, () => base as InterfaceType);
        return {'k': 'data', 'n': id};
      case 'widget':
        return {'k': 'widget'};
      case 'handle':
        return {'k': 'handle', 'n': base.getDisplayString()};
      case 'callback':
        return _mCallback(cls.cb!);
    }
    return {'k': 'never'};
  }

  Map<String, Object?> _mElem(DartType t) => nullable(t) && t is! DynamicType ? {...mt(t), 'nullable': true} : mt(t);

  Map<String, Object?> _mCallback(CbInfo cb) {
    final real = cb.args.where((a) => a.enc.kind != 'context').toList();
    return {
      'k': 'callback',
      'args': [
        for (final a in real)
          {'name': a.name, 'type': mOut(a.type, a.enc), if (nullable(a.type) && a.enc.kind != 'generic') 'nullable': true},
      ],
    };
  }

  /// Manifest type descriptor for a Dart -> JS value (callback payloads).
  Map<String, Object?> mOut(DartType t, Enc e) {
    switch (e.kind) {
      case 'prim':
        final b = nn(t);
        return {'k': b.isDartCoreBool ? 'bool' : b.isDartCoreString ? 'string' : b.isDartCoreInt ? 'int' : 'num'};
      case 'double':
        return {'k': 'double'};
      case 'enum':
        final el = nn(t).element as EnumElement;
        _tsEnums[el.name!] = el;
        return {'k': 'enum', 'n': el.name!};
      case 'generic':
        return {'k': 'unknown'};
      case 'coll':
        final et = _iterArg(t);
        return {'k': 'list', 'e': {...mOut(et, e.elem!), if (nullable(et)) 'nullable': true}};
      case 'class':
        final o = _encOverride(nn(t) as InterfaceType);
        if (o != null) return {'k': o.tsOut == 'string' ? 'string' : o.tsOut == 'number' ? 'num' : 'unknown'};
        final id = ident(t);
        _encoders.putIfAbsent(id, () => nn(t) as InterfaceType);
        return {'k': 'payload', 'n': id};
    }
    return {'k': 'never'};
  }

  Map<String, Object?> _mData(String id, InterfaceType t) {
    final d = c.classify(t).data!;
    final ovs = _overridesFor(d);
    final replace = ovs.any((o) => o.replace);
    final variants = <Map<String, Object?>>[];
    if (!replace) {
      for (final v in d.variants) {
        final fields = <String, Object?>{};
        for (final p in v.params) {
          final cls = c.classify(p.type);
          final optional = !p.mustSupply || cls.family == 'dynamic' || cls.family == 'generic';
          // skip params whose default could not be regenerated
          if (hasDefault(p.el) && defaultCode(p.el) == null) continue;
          if (!hasDefault(p.el) && !p.nullable && !p.mustSupply && cls.family != 'dynamic' && cls.family != 'generic') continue;
          fields[p.name] = {
            'type': mt(p.type),
            if (!optional) 'required': true,
            if (p.nullable && cls.coll == null && cls.family != 'dynamic' && cls.family != 'generic') 'nullable': true,
          };
        }
        variants.add({'tag': v.tag, 'fields': fields, if (v.dropped.isNotEmpty) 'omitted': v.dropped});
      }
    }
    final doc = docs == 'none' ? null : _docText(t.element.documentationComment, first: true);
    return {
      'dart': t.getDisplayString(),
      if (doc != null) 'doc': doc,
      if (ovs.isNotEmpty)
        'nice': [
          for (final o in ovs) {'ts': o.tsIn, 'accepts': o.accepts},
        ],
      if (replace) 'replace': true,
      if (!replace && d.consts.isNotEmpty) 'consts': [for (final k in d.consts) k.label],
      if (variants.isNotEmpty) 'variants': variants,
    };
  }

  Map<String, Object?> _mPayload(String id, InterfaceType t) {
    final e = c.encodable(t);
    return {
      'dart': t.getDisplayString(),
      'fields': {
        for (final (n, ft, fe) in e.fields) n: {...mOut(ft, fe), if (nullable(ft) && fe.kind != 'generic') 'nullable': true},
      },
    };
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
      mSkipped[component] = rep.skipped!;
      return;
    }
    final type = w.ts.instantiateInterfaceToBounds(element: el, nullabilitySuffix: NullabilitySuffix.none);
    final ctor = type.constructors.where((k) => (k.name ?? 'new') == ctorName).firstOrNull;
    if (ctor == null || ctor.isPrivate) {
      rep.skipped = 'constructor not found';
      mSkipped[component] = rep.skipped!;
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
    final mProps = <String, Object?>{};
    String? childrenKind; // child | children | text
    String? childrenParam;
    var acceptsChildren = false;

    for (final p in params) {
      final cls = c.classify(p.type);
      final pp = P(p, p.type, cls);
      final name = pp.name;
      final src = "p['$name']";
      String? expr;
      Map<String, Object?>? tsT;
      var tsOptional = !pp.mustSupply;
      String? drop;

      if (p.metadata.hasDeprecated) {
        drop = 'deprecated';
      } else if (cls.family == 'key') {
        drop = name == 'key' ? 'key (FuseNodeWidget already keys by node id)' : 'key';
      } else if (cls.family == 'widget' && cls.ok) {
        if (cls.sub == 'preferredSize' && cls.coll == null) {
          expr = "fusePreferredSize(node, '$name')";
          tsT = {'k': 'widget', 'preferredSize': true};
          rep.notes.add('$name: PreferredSizeWidget slot wrapped in PreferredSize (fixed height hack)');
          if (pp.mustSupply) expr = "fuseReq($expr, '$component', '$name')";
        } else if (cls.coll == null && (name == 'child' || name == hint)) {
          expr = pp.nullable ? 'fuseChild(node)' : 'fuseChild(node) ?? const SizedBox.shrink()';
          acceptsChildren = true;
          childrenKind = 'child';
          childrenParam = name;
        } else if (cls.coll == 'list' && (name == 'children' || name == hint)) {
          expr = 'node.childWidgets';
          acceptsChildren = true;
          childrenKind = 'children';
          childrenParam = name;
        } else if (cls.coll == null) {
          expr = pp.nullable ? "node.widget('$name')" : "node.widget('$name') ?? const SizedBox.shrink()";
          tsT = {'k': 'widget'};
          if (!pp.nullable && !p.hasDefaultValue) tsOptional = false;
        } else if (cls.coll == 'list') {
          expr = "fuseWidgetList(node, '$name')";
          if (!pp.nullable) expr = '$expr ?? const <Widget>[]';
          tsT = {'k': 'widgets'};
          tsOptional = true;
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
        tsT = _mCallback(cb);
        if (!pp.nullable) tsOptional = true;
      } else if (cls.family == 'handle' && cls.coll == null) {
        expr = "node.handle<${tc(nn(p.type))}>('$name')";
        if (pp.mustSupply) expr = "fuseReq($expr, '$component', '$name')";
        if (!pp.nullable && !pp.mustSupply) drop = 'handle with non-null default';
        tsT = mt(p.type);
      } else if (cls.ok && const {'primitive', 'enum', 'data', 'dynamic', 'generic'}.contains(cls.family)) {
        // Text content rule: first required positional String, no child slot.
        if (p.isRequiredPositional && nn(p.type).isDartCoreString && !hasChild && params.first == p) {
          expr = '${dec(p.type, src)} ?? fuseText(node)';
          tsOptional = true;
          acceptsChildren = true;
          childrenKind = 'text';
          childrenParam = name;
          rep.notes.add('$name: positional String is filled from text children when the prop is absent');
        } else {
          expr = argExpr(pp, src, component);
          if (expr == null) drop = 'default value not reproducible (${p.defaultValueCode})';
        }
        tsT = mt(p.type);
        if (cls.family == 'dynamic' || cls.family == 'generic') tsOptional = !p.isRequired;
        if (cls.partial) rep.notes.add('$name: data type ${nn(p.type).getDisplayString()} has dropped optional ctor params');
      } else {
        drop = cls.label;
      }

      if (drop != null) {
        if (pp.mustSupply) {
          rep.skipped = 'required param `$name` (${p.type.getDisplayString()}) is not bridgeable: $drop';
          mSkipped[component] = rep.skipped!;
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
        final doc = docs == 'none' ? null : _docText(_paramDoc(p, type));
        final nullish = pp.nullable && p.isRequired;
        mProps[name] = {
          'type': tsT,
          'dart': p.type.getDisplayString(),
          if (!tsOptional) 'required': true,
          if (nullish) 'nullable': true,
          if (dflt != null) 'default': dflt,
          if (doc != null) 'doc': doc,
        };
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
    d.writeln('    try {');
    d.writeln('      return ${ref(el)}$ta$ctorSuffix(');
    for (final a in [...pos, ...named]) {
      d.writeln('        $a,');
    }
    d.writeln('      );');
    d.writeln('    } catch (e, st) {');
    d.writeln('      return fuseBuildError(context, node, e, st);');
    d.writeln('    }');
    d.writeln('  }');
    d.writeln('}');
    rep.dartLines = '\n'.allMatches(d.toString()).length;
    _dartWidgets.writeln(d);
    final tag = '$unit.$component';
    _registrations.add("  runtime.registerWidget('$tag', $dartName.new);");

    final ownFlex = params.any((p) => p.name == 'flex');
    if (ownFlex && acceptsChildren) rep.notes.add('flex: collides with solid-fuse\'s `flex` layout prop; the Flutter parameter wins');
    final classDoc = docs == 'none' ? null : _docText(el.documentationComment);
    mWidgets[component] = {
      'tag': tag,
      'dart': el.name,
      if (ctorName != 'new') 'ctor': ctorName,
      'library': el.library.uri.toString(),
      if (classDoc != null) 'doc': classDoc,
      if (childrenKind != null) 'children': childrenKind,
      if (childrenParam != null) 'childrenParam': childrenParam,
      // solid-fuse's `flex` layout convention applies when several JSX
      // children fill a single `child:` (unless the widget has its own flex).
      if (childrenKind == 'child' && !ownFlex) 'flexProp': true,
      'props': mProps,
      if (rep.dropped.isNotEmpty) 'omitted': rep.dropped,
      if (rep.notes.isNotEmpty) 'notes': rep.notes,
    };
  }

  // ── output ───────────────────────────────────────────────────────────────

  ({String dart, Map<String, Object?> manifest, int codecLines}) finish() {
    // Emit codecs to a fixpoint (emitting one may request more).
    final decOut = <String, String>{};
    final encOut = <String, String>{};
    final mTypes = <String, Object?>{};
    final mPayloads = <String, Object?>{};
    var progress = true;
    while (progress) {
      progress = false;
      for (final e in _decoders.entries.toList()) {
        if (decOut.containsKey(e.key)) continue;
        decOut[e.key] = _emitDecoder(e.key, e.value);
        mTypes[e.key] = _mData(e.key, e.value);
        progress = true;
      }
      for (final e in _encoders.entries.toList()) {
        if (encOut.containsKey(e.key)) continue;
        encOut[e.key] = _emitEncoder(e.key, e.value);
        mPayloads[e.key] = _mPayload(e.key, e.value);
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
    dart.writeln('// GENERATED by `fuse gen` from resolved Dart APIs. Do not edit.');
    dart.writeln('// ignore_for_file: type=lint, deprecated_member_use');
    final imports = {
      'package:flutter/material.dart': null,
      'package:solid_fuse/solid_fuse.dart': null,
      supportImport: null,
      ..._imports,
    };
    final uris = imports.keys.toList()..sort();
    for (final u in uris) {
      if (u == 'dart:core') continue;
      dart.writeln(imports[u] == null ? "import '$u';" : "import '$u' as ${imports[u]};");
    }
    dart.writeln();
    dart.writeln('void $registerName(FuseRuntime runtime) {');
    _registrations.forEach(dart.writeln);
    dart.writeln('}');
    dart.writeln();
    dart.write(_dartWidgets);
    dart.write(codecs);

    Map<String, Object?> sorted(Map<String, Object?> m) => {for (final k in m.keys.toList()..sort()) k: m[k]};
    final manifest = <String, Object?>{
      'unit': unit,
      'register': registerName,
      'widgets': mWidgets,
      if (mSkipped.isNotEmpty) 'skipped': mSkipped,
      'enums': {
        for (final k in _tsEnums.keys.toList()..sort())
          k: {
            'values': [for (final c in _tsEnums[k]!.constants) c.name],
            if (docs != 'none' && _docText(_tsEnums[k]!.documentationComment, first: true) != null)
              'doc': _docText(_tsEnums[k]!.documentationComment, first: true),
          },
      },
      'types': sorted(mTypes),
      'payloads': sorted(mPayloads),
    };
    return (dart: dart.toString(), manifest: manifest, codecLines: '\n'.allMatches(codecs.toString()).length);
  }

  String get registerName {
    final camel = unit.split(RegExp(r'[^A-Za-z0-9]+')).where((s) => s.isNotEmpty).map((s) => s[0].toUpperCase() + s.substring(1)).join();
    return 'register${camel}Widgets';
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
