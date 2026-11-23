// Dart source text for types and constant defaults, written against the
// import prefixes of [World.entries]. The manifest carries these strings so
// the emitters (TypeScript, in the fuse CLI) never have to know Dart's rules
// for naming things.
import 'package:analyzer/dart/constant/value.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/nullability_suffix.dart';
import 'package:analyzer/dart/element/type.dart';

import 'world.dart';

class NotNameable implements Exception {
  NotNameable(this.what);
  final String what;
  @override
  String toString() => 'not nameable from generated code: $what';
}

class DartCode {
  DartCode(this.w);
  final World w;

  /// Entry libraries that the strings produced so far refer to.
  final Set<EntryLib> used = {};

  String ref(Element e) {
    final lib = w.importOf(e);
    if (lib == null) throw NotNameable(e.name ?? '?');
    used.add(lib);
    return lib.prefix.isEmpty ? e.name! : '${lib.prefix}.${e.name}';
  }

  /// Source for [t]. Type parameters keep their name; the emitter that
  /// instantiates a generic widget substitutes them.
  String type(DartType t) {
    final q = t.nullabilitySuffix == NullabilitySuffix.question ? '?' : '';
    if (t is DynamicType) return 'dynamic';
    if (t is VoidType) return 'void';
    if (t is NeverType) return 'Never$q';
    if (t is TypeParameterType) return '${t.element.name}$q';
    if (t is InterfaceType) {
      final args = t.typeArguments.isEmpty ? '' : '<${t.typeArguments.map(type).join(', ')}>';
      return '${ref(t.element)}$args$q';
    }
    if (t is FunctionType) {
      final pos = [
        for (final p in t.formalParameters)
          if (p.isRequiredPositional) type(p.type),
      ];
      final opt = [
        for (final p in t.formalParameters)
          if (p.isOptionalPositional) type(p.type),
      ];
      final named = [
        for (final p in t.formalParameters)
          if (p.isNamed) '${p.isRequired ? 'required ' : ''}${type(p.type)} ${p.name}',
      ];
      final parts = [
        ...pos,
        if (opt.isNotEmpty) '[${opt.join(', ')}]',
        if (named.isNotEmpty) '{${named.join(', ')}}',
      ];
      return '${type(t.returnType)} Function(${parts.join(', ')})$q';
    }
    if (t is RecordType) throw NotNameable('record type');
    return 'dynamic';
  }

  // ── defaults ──────────────────────────────────────────────────────────────

  /// The parameter a redirecting factory's parameter forwards to. Redirecting
  /// factories (`const factory EdgeInsetsGeometry.only({double left}) =
  /// EdgeInsets.only;`) declare no defaults of their own.
  FormalParameterElement? _redirectTarget(FormalParameterElement p) {
    final ctor = p.baseElement.enclosingElement;
    if (ctor is! ConstructorElement) return null;
    final target = ctor.redirectedConstructor;
    if (target == null) return null;
    final theirs = target.formalParameters;
    if (p.isNamed) return theirs.where((t) => t.isNamed && t.name == p.name).firstOrNull;
    final i = ctor.formalParameters.where((x) => x.isPositional).toList().indexWhere((x) => x.name == p.name);
    final pos = theirs.where((x) => x.isPositional).toList();
    return i >= 0 && i < pos.length ? pos[i] : null;
  }

  bool hasDefault(FormalParameterElement p) {
    final t = _redirectTarget(p);
    return t != null ? hasDefault(t) : p.hasDefaultValue;
  }

  /// Dart source reproducing [p]'s default, or null when it cannot be named
  /// from outside its library (private constants, closures).
  String? defaultOf(FormalParameterElement p) {
    final rt = _redirectTarget(p);
    if (rt != null) {
      if (hasDefault(rt)) return defaultOf(rt);
      return p.type.nullabilitySuffix == NullabilitySuffix.question ? 'null' : null;
    }
    final v = p.baseElement.computeConstantValue();
    if (v == null) return null;
    try {
      return constant(v);
    } on Object {
      return null;
    }
  }

  /// The default as a JSON value, when it is a plain one (docs, TS).
  Object? defaultJson(FormalParameterElement p) {
    final rt = _redirectTarget(p);
    if (rt != null) return hasDefault(rt) ? defaultJson(rt) : null;
    final v = p.baseElement.computeConstantValue();
    if (v == null || v.isNull) return null;
    final t = v.type;
    if (t == null) return null;
    if (t.isDartCoreBool) return v.toBoolValue();
    if (t.isDartCoreInt) return v.toIntValue();
    if (t.isDartCoreDouble) {
      final d = v.toDoubleValue()!;
      return d.isFinite ? d : null;
    }
    if (t.isDartCoreString) return v.toStringValue();
    final el = t.element;
    if (el is EnumElement) {
      final idx = v.getField('index')?.toIntValue();
      if (idx != null && idx < el.constants.length) return el.constants[idx].name;
    }
    return null;
  }

  String constant(DartObject o, {bool inConst = false}) {
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
    if (t == null) throw NotNameable('untyped constant');
    if (t.isDartCoreBool) return '${o.toBoolValue()!}';
    if (t.isDartCoreInt) return '${o.toIntValue()!}';
    if (t.isDartCoreDouble) {
      final d = o.toDoubleValue()!;
      if (d.isNaN) return 'double.nan';
      if (d.isInfinite) return d > 0 ? 'double.infinity' : 'double.negativeInfinity';
      return '$d';
    }
    if (t.isDartCoreString) return stringLiteral(o.toStringValue()!);
    final el = t.element;
    if (el is EnumElement) {
      final idx = o.getField('index')?.toIntValue();
      if (idx != null && w.isExported(el)) return '${ref(el)}.${el.constants[idx].name}';
      throw NotNameable('enum constant');
    }
    final k = inConst ? '' : 'const ';
    final list = o.toListValue();
    if (list != null) {
      return '$k<${type((t as InterfaceType).typeArguments.first)}>[${list.map((e) => constant(e, inConst: true)).join(', ')}]';
    }
    final set = o.toSetValue();
    if (set != null) {
      return '$k<${type((t as InterfaceType).typeArguments.first)}>{${set.map((e) => constant(e, inConst: true)).join(', ')}}';
    }
    final map = o.toMapValue();
    if (map != null) {
      final ta = (t as InterfaceType).typeArguments.map(type).join(', ');
      return '$k<$ta>{${map.entries.map((e) => '${constant(e.key!, inConst: true)}: ${constant(e.value!, inConst: true)}').join(', ')}}';
    }
    final fn = o.toFunctionValue();
    if (fn != null) {
      final owner = fn.enclosingElement;
      if (fn.isPublic && owner is InterfaceElement && w.isExported(owner)) return '${ref(owner)}.${fn.name}';
      if (fn.isPublic && w.isExported(fn)) return ref(fn);
      throw NotNameable('private function');
    }
    final inv = o.constructorInvocation;
    if (inv != null && t is InterfaceType) {
      final ctor = inv.constructor;
      // The class that declares the constructor: a redirecting factory
      // (`TileDisplay.fadeIn` -> FadeInTileDisplay) is called on its own class.
      final owner = ctor.enclosingElement;
      if (ctor.isPrivate || owner.isPrivate) throw NotNameable('private constructor');
      final name = (ctor.name == null || ctor.name == 'new') ? '' : '.${ctor.name}';
      final args = [
        ...inv.positionalArguments.map((a) => constant(a, inConst: true)),
        ...inv.namedArguments.entries.map((e) => '${e.key}: ${constant(e.value, inConst: true)}'),
      ];
      final ta = owner != t.element || t.typeArguments.isEmpty ? '' : '<${t.typeArguments.map(type).join(', ')}>';
      return '$k${ref(owner)}$ta$name(${args.join(', ')})';
    }
    throw NotNameable('constant of ${t.getDisplayString()}');
  }

  static String stringLiteral(String s) =>
      "'${s.replaceAll(r'\', r'\\').replaceAll("'", r"\'").replaceAll(r'$', r'\$').replaceAll('\n', r'\n').replaceAll('\r', r'\r')}'";
}
