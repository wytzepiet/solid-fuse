// The member model for the "object" kind: how every public member of a class
// with identity would cross an async JSON bridge. Shared by the survey
// (tool/survey_objects.dart) and the emitters (objgen.dart, modgen.dart).
//
// Like classify.dart, the rules are structural. The only names known here are
// framework roots: Listenable, ValueListenable, Animation (status listener),
// TickerProvider (vsync), BuildContext, Future, Stream.
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/nullability_suffix.dart';
import 'package:analyzer/dart/element/type.dart';

import 'classify.dart';
import 'world.dart';

/// Members that are plumbing of the object kind itself (listener wiring,
/// lifetime, diagnostics). They are handled by the generated shape, not
/// exposed as RPC.
const plumbing = {
  'addListener', 'removeListener', 'notifyListeners', 'hasListeners', 'dispose',
  'addStatusListener', 'removeStatusListener', 'notifyStatusListeners',
  'toString', 'toStringShort', 'toStringShallow', 'toStringDeep', 'toStringDetails',
  'toDiagnosticsNode', 'debugFillProperties', 'debugDescribeChildren',
  'hashCode', 'runtimeType', 'noSuchMethod',
  'didRegisterListener', 'didUnregisterListener', 'didStartListening', 'didStopListening',
  'clearListeners', 'clearStatusListeners',
};

class ParamM {
  ParamM(this.el, this.type, this.kind, {this.why, this.cls});
  final FormalParameterElement el;
  final DartType type;

  /// data | object | callback | callback-async | env-vsync | env-context | unbridgeable
  final String kind;
  final String? why;
  final Cls? cls;
  String get name => el.name ?? '_';
  bool get nullable => type.nullabilitySuffix == NullabilitySuffix.question;
  bool get mustSupply => el.isRequired && !nullable && !el.hasDefaultValue;

  /// Crosses by rule (JS -> Dart) or is provided by the generated host.
  bool get ok => kind == 'data' || kind == 'object' || kind == 'callback' || kind == 'env-vsync';
}

class CtorM {
  CtorM(this.el, this.params);
  final ConstructorElement el;
  final List<ParamM> params;
  String get name => (el.name == null || el.name == 'new') ? '' : el.name!;
  String? get blocker {
    for (final p in params) {
      if (p.mustSupply && !p.ok) return '${p.name}: ${p.kind}${p.why == null ? '' : ' (${p.why})'}';
    }
    return null;
  }

  bool get usable => blocker == null;
}

class RetM {
  RetM(this.kind, {this.value, this.enc, this.why});

  /// void | value | object | stream | unbridgeable   (async = wrapped in Future)
  final String kind;
  final DartType? value;
  final Enc? enc;
  final String? why;
  bool isAsync = false;
  bool get ok => kind != 'unbridgeable';
  String get label => isAsync ? 'future-$kind' : kind;
}

class MethodM {
  MethodM(this.el, this.params, this.ret, this.declaredIn);
  final MethodElement el;
  final List<ParamM> params;
  final RetM ret;
  final InterfaceElement declaredIn;
  String get name => el.name!;
  String? get blocker {
    for (final p in params) {
      // callbacks as *method* arguments need per-call callback ids; not on the wire today
      if (p.mustSupply && !(p.kind == 'data' || p.kind == 'object')) {
        return '${p.name}: ${p.kind}${p.why == null ? '' : ' (${p.why})'}';
      }
    }
    if (el.typeParameters.isNotEmpty) return 'generic method';
    if (!ret.ok) return 'returns ${ret.why}';
    return null;
  }

  bool get ok => blocker == null;

  /// Bridgeable without any other object crossing (no object args / result).
  bool get okStandalone =>
      ok && ret.kind != 'object' && !params.any((p) => p.kind == 'object' && p.mustSupply);
}

class GetterM {
  GetterM(this.el, this.ret, this.declaredIn);
  final GetterElement el;
  final RetM ret;
  final InterfaceElement declaredIn;
  String get name => el.name!;
}

class SetterM {
  SetterM(this.el, this.param, this.declaredIn);
  final SetterElement el;
  final ParamM param;
  final InterfaceElement declaredIn;
  String get name => el.name!;
  bool get ok => param.kind == 'data' || param.kind == 'object';
}

class ObjM {
  ObjM(this.type);
  final InterfaceType type;
  InterfaceElement get el => type.element;
  String get name => el.name!;

  bool listenable = false;
  DartType? valueListenableOf; // ValueListenable<T>
  bool hasStatus = false; // Animation: addStatusListener
  bool hasDispose = false;
  bool isAbstract = false;
  final ctors = <CtorM>[];
  final methods = <MethodM>[];
  final getters = <GetterM>[];
  final setters = <SetterM>[];
  final staticMethods = <MethodM>[];
  final staticGetters = <GetterM>[];

  /// How reactive state can be pushed: valueListenable | listenable | stream | none
  String get push => valueListenableOf != null
      ? 'valueListenable'
      : listenable
          ? 'listenable'
          : getters.any((g) => g.ret.kind == 'stream') || methods.any((m) => m.ret.kind == 'stream')
              ? 'stream'
              : 'none';
}

class ObjectModeler {
  ObjectModeler(this.w, this.c, {this.objectNames = const {}});
  final World w;
  final Classifier c;

  /// Extra class names to treat as identity objects even when the structural
  /// test says "record" (declared in the override file).
  final Set<String> objectNames;

  late final InterfaceElement? valueListenableEl = _find('ValueListenable');
  late final InterfaceElement? animationEl = _find('Animation');
  late final InterfaceElement? tickerProviderEl = _find('TickerProvider');
  late final InterfaceElement futureEl = w.material.typeProvider.futureElement;
  late final InterfaceElement streamEl = w.material.typeProvider.streamElement;

  InterfaceElement? _find(String n) {
    for (final e in w.entries) {
      final x = e.element.exportNamespace.get2(n);
      if (x is InterfaceElement) return x;
    }
    return null;
  }

  final _memo = <String, ObjM>{};

  bool _hasDispose(InterfaceType t) {
    final m = t.lookUpMethod('dispose', w.material);
    return m != null && m.formalParameters.isEmpty && !m.isStatic;
  }

  /// Identity test: a Listenable, something with a `dispose()`, or what the
  /// widget classifier already calls a handle (`*Controller`, `*FocusNode`).
  bool isObject(DartType t) {
    final nn = w.ts.promoteToNonNull(t);
    if (nn is! InterfaceType) return false;
    if (nn.isDartCoreObject || nn.element is EnumElement) return false;
    if (nn.isDartAsyncFuture || nn.isDartAsyncStream || nn.isDartAsyncFutureOr) return false;
    if (nn.asInstanceOf(futureEl) != null || nn.asInstanceOf(streamEl) != null) return false;
    final lib = nn.element.library.uri.toString();
    if (lib == 'dart:core' || lib == 'dart:typed_data' || lib == 'dart:collection') return false;
    if (w.isSubtypeOfEl(nn, w.widgetEl) || w.isSubtypeOfEl(nn, w.keyEl)) return false;
    if (nn.element == w.buildContextEl ||
        w.isSubtypeOfEl(nn, w.stateEl) ||
        w.isSubtypeOfEl(nn, w.renderObjectEl) ||
        w.isSubtypeOfEl(nn, w.elementEl)) return false;
    if (objectNames.contains(nn.element.name)) return true;
    if (w.isSubtypeOfEl(nn, w.listenableEl)) return true;
    if (_hasDispose(nn)) return true;
    final n = nn.element.name ?? '';
    return n.endsWith('Controller') || n.endsWith('FocusNode');
  }

  bool _hidden(Element e) =>
      e.isPrivate ||
      e.metadata.hasDeprecated ||
      e.metadata.hasProtected ||
      e.metadata.hasVisibleForTesting ||
      e.metadata.hasVisibleForOverriding ||
      e.metadata.hasInternal;

  /// Any declaration of [name] up the hierarchy is protected/internal.
  bool _hiddenInHierarchy(InterfaceType t, String name, Element? Function(InterfaceType st) pick) {
    for (final st in [t, ...t.allSupertypes]) {
      final e = pick(st);
      if (e != null && _hidden(e)) return true;
    }
    return false;
  }

  ParamM param(FormalParameterElement p) {
    final t = p.type;
    final nn = w.ts.promoteToNonNull(t);
    if (nn is InterfaceType) {
      if (tickerProviderEl != null && nn.element == tickerProviderEl) return ParamM(p, t, 'env-vsync');
      if (nn.element == w.buildContextEl) return ParamM(p, t, 'env-context');
    }
    final cls = c.classify(t);
    if (cls.family == 'callback' || cls.family == 'builder') {
      if (cls.ok && cls.coll == null) return ParamM(p, t, 'callback', cls: cls);
      if (cls.family == 'callback' && cls.sub.startsWith('Future') && cls.cb!.argsEncodable && cls.coll == null) {
        return ParamM(p, t, 'callback-async', cls: cls, why: 'needs _functionCallAsync');
      }
      return ParamM(p, t, 'unbridgeable', cls: cls, why: cls.family == 'builder' ? 'builder' : 'callback ${cls.sub}');
    }
    if (isObject(t)) {
      if (cls.coll != null) return ParamM(p, t, 'unbridgeable', cls: cls, why: 'collection of objects');
      return ParamM(p, t, 'object', cls: cls);
    }
    if (cls.ok && const {'primitive', 'enum', 'data', 'dynamic', 'generic'}.contains(cls.family)) {
      return ParamM(p, t, 'data', cls: cls);
    }
    return ParamM(p, t, 'unbridgeable', cls: cls, why: cls.label);
  }

  RetM ret(DartType t) {
    if (t is VoidType) return RetM('void');
    final nn = w.ts.promoteToNonNull(t);
    if (nn is InterfaceType) {
      if (nn.isDartAsyncFutureOr) {
        return ret(nn.typeArguments.first)..isAsync = true;
      }
      final f = nn.asInstanceOf(futureEl);
      if (f != null) {
        return ret(f.typeArguments.first)..isAsync = true;
      }
      final s = nn.asInstanceOf(streamEl);
      if (s != null) {
        final et = s.typeArguments.first;
        final e = et is VoidType ? Enc('generic') : c.encodable(et);
        return e.ok
            ? RetM('stream', value: et, enc: e)
            : RetM('unbridgeable', why: 'Stream<${et.getDisplayString()}> (event not encodable)');
      }
    }
    if (t is DynamicType || nn.isDartCoreNull) return RetM('value', value: t, enc: Enc('generic'));
    if (t is NeverType) return RetM('void');
    if (isObject(t)) return RetM('object', value: t);
    final e = c.encodable(t);
    if (e.ok && !e.weak) return RetM('value', value: t, enc: e);
    return RetM('unbridgeable', why: '${t.getDisplayString()} (${e.ok ? 'no record shape' : 'not encodable'})');
  }

  ObjM model(InterfaceType t) {
    final key = c.keyOf(t);
    final hit = _memo[key];
    if (hit != null) return hit;
    final o = _memo[key] = ObjM(t);
    final el = t.element;
    final lib = w.material;
    o.isAbstract = el is ClassElement && el.isAbstract;
    o.listenable = w.isSubtypeOfEl(t, w.listenableEl);
    o.hasDispose = _hasDispose(t);
    if (valueListenableEl != null) {
      o.valueListenableOf = t.asInstanceOf(valueListenableEl!)?.typeArguments.first;
    }
    o.hasStatus = animationEl != null && t.asInstanceOf(animationEl!) != null;

    // constructors
    for (final k in t.constructors) {
      if (_hidden(k)) continue;
      if (o.isAbstract && !k.isFactory) continue;
      o.ctors.add(CtorM(k, [for (final p in k.formalParameters) param(p)]));
    }

    // instance members, most-derived declaration per name
    final mNames = <String>{}, gNames = <String>{}, sNames = <String>{};
    for (final st in [t, ...t.allSupertypes]) {
      if (st.isDartCoreObject) continue;
      for (final m in st.methods) {
        if (!m.isStatic && m.name != null) mNames.add(m.name!);
      }
      for (final g in st.getters) {
        if (!g.isStatic && g.name != null) gNames.add(g.name!);
      }
      for (final s in st.setters) {
        if (!s.isStatic && s.name != null) sNames.add(s.name!);
      }
    }
    bool skipName(String n) =>
        n.startsWith('_') || plumbing.contains(n) || n.startsWith('debug') || !RegExp(r'^[A-Za-z]').hasMatch(n);

    for (final n in mNames.toList()..sort()) {
      if (skipName(n)) continue;
      final m = t.lookUpMethod(n, lib) ?? t.lookUpMethod(n, lib, inherited: true);
      if (m == null || m.isOperator) continue;
      if (_hiddenInHierarchy(t, n, (st) => st.methods.where((x) => x.name == n).firstOrNull)) continue;
      o.methods.add(MethodM(m, [for (final p in m.formalParameters) param(p)], ret(m.returnType),
          m.enclosingElement as InterfaceElement));
    }
    for (final n in gNames.toList()..sort()) {
      if (skipName(n)) continue;
      final g = t.lookUpGetter(n, lib) ?? t.lookUpGetter(n, lib, inherited: true);
      if (g == null) continue;
      if (_hiddenInHierarchy(t, n, (st) => st.getters.where((x) => x.name == n).firstOrNull)) continue;
      // function-typed fields are stored callbacks, not state
      if (w.ts.promoteToNonNull(g.returnType) is FunctionType) continue;
      o.getters.add(GetterM(g, ret(g.returnType), g.enclosingElement as InterfaceElement));
    }
    for (final n in sNames.toList()..sort()) {
      if (skipName(n)) continue;
      final s = t.lookUpSetter(n, lib) ?? t.lookUpSetter(n, lib, inherited: true);
      if (s == null || s.formalParameters.isEmpty) continue;
      if (_hiddenInHierarchy(t, n, (st) => st.setters.where((x) => x.name == n).firstOrNull)) continue;
      o.setters.add(SetterM(s, param(s.formalParameters.first), s.enclosingElement as InterfaceElement));
    }

    // statics (used by the non-UI module emitter)
    for (final m in el.methods) {
      if (!m.isStatic || _hidden(m) || skipName(m.name ?? '_')) continue;
      o.staticMethods.add(MethodM(m, [for (final p in m.formalParameters) param(p)], ret(m.returnType), el));
    }
    for (final g in el.getters) {
      if (!g.isStatic || _hidden(g) || skipName(g.name ?? '_')) continue;
      if (g.variable.isConst) continue;
      o.staticGetters.add(GetterM(g, ret(g.returnType), el));
    }
    return o;
  }
}
