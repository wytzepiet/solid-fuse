// The rule engine: DartType -> how it crosses the JSON bridge.
//
// Every rule here is *general* (structural); there is no per-type knowledge
// except the short list of framework roots in [World] (Widget, Key,
// Listenable, BuildContext, State, RenderObject, Element).
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/nullability_suffix.dart';
import 'package:analyzer/dart/element/type.dart';

import 'world.dart';

/// Above this many concrete subclasses a hierarchy is considered open and only
/// the declared type's own constructors are used.
const kMaxSubclasses = 40;

class Cls {
  Cls(this.family, this.sub,
      {this.ok = true,
      this.partial = false,
      this.data,
      this.cb,
      this.coll,
      this.elem,
      this.keyType});
  final String family;
  final String sub;

  /// Covered by the general rules (possibly with dropped optional parts).
  bool ok;
  bool partial;
  final DataInfo? data;
  final CbInfo? cb;

  /// 'list' | 'set' | 'iterable' | 'map' for collections; [elem] is the
  /// element classification (the family/sub of a collection mirror elem's).
  final String? coll;
  final Cls? elem;
  final DartType? keyType;

  String get label => coll == null ? '$family/$sub' : '$family/$sub[$coll]';
}

class P {
  P(this.el, this.type, this.cls);
  final FormalParameterElement el;
  final DartType type;
  final Cls cls;
  String get name => el.name ?? '_';
  bool get nullable => type.nullabilitySuffix == NullabilitySuffix.question;

  /// Caller must supply a non-null value.
  bool get mustSupply => el.isRequired && !nullable && !el.hasDefaultValue;
}

class Variant {
  Variant(this.tag, this.type, this.ctor);
  final String? tag;
  final InterfaceType type;
  final ConstructorElement ctor;
  final List<P> params = [];

  /// name -> reason. Required-nullable dropped params are passed as null.
  final Map<String, String> dropped = {};
  final List<P> passNull = [];
}

class ConstRef {
  ConstRef(this.label, this.owner, this.field);
  final String label;
  final InterfaceElement owner;
  final FieldElement field;
}

class DataInfo {
  DataInfo(this.type);
  final InterfaceType type;
  final List<Variant> variants = [];
  final List<ConstRef> consts = [];
  final Map<String, String> rejected = {}; // ctor -> reason
  bool openHierarchy = false;
  bool constsCapped = false;
  int constCount = 0;
  bool get usable => variants.isNotEmpty || consts.isNotEmpty;
  bool get partial => variants.any((v) => v.dropped.isNotEmpty);
}

class CbArg {
  CbArg(this.name, this.type, this.enc);
  final String name;
  final DartType type;
  final Enc enc;
}

class CbInfo {
  CbInfo(this.type, this.ret);
  final FunctionType type;

  /// void | future-void | widget | value | future-value
  final String ret;
  final List<CbArg> args = [];
  bool hasContext = false;
  bool hasNamed = false;
  bool get argsEncodable => args.every((a) => a.enc.ok) && !hasNamed;
}

class Enc {
  Enc(this.kind, {this.ok = true, this.elem});

  /// prim | double | enum | generic | coll | class | none
  final String kind;
  bool ok;
  final Enc? elem;
  final List<(String, DartType, Enc)> fields = [];
}

class Classifier {
  Classifier(this.w, {this.nested = false, this.maxConsts = 400, this.codecTypes = const {}});

  /// Element names that have a hand-written codec override; such a type is
  /// bridgeable even when no constructor/constant can be derived (IconData).
  final Set<String> codecTypes;
  final World w;

  /// Allow widgets / void callbacks / handles *inside* data classes (needs the
  /// wire format to carry node refs and function markers at nested paths).
  final bool nested;
  final int maxConsts;

  final Map<String, Cls> _memo = {};
  final Map<String, Enc> _encMemo = {};

  String keyOf(DartType t) {
    final nn = w.ts.promoteToNonNull(t);
    final lib = nn.element?.library?.uri.toString() ?? '';
    return '$lib|${nn.getDisplayString()}';
  }

  Cls classify(DartType t) {
    final key = keyOf(t);
    final hit = _memo[key];
    if (hit != null) return hit;
    return _memo[key] = _classify(w.ts.promoteToNonNull(t), key);
  }

  Cls _unb(String why) => Cls('unbridgeable', why, ok: false);

  Cls _classify(DartType t, String key) {
    if (t is DynamicType) return Cls('dynamic', 'dynamic');
    if (t is VoidType || t is NeverType || t.isDartCoreNull) return _unb('void/never');
    if (t is InvalidType) return _unb('invalid');
    if (t is TypeParameterType) return Cls('generic', 'type-parameter');
    if (t is RecordType) return _unb('record');
    if (t is FunctionType) return _callback(t);
    if (t is! InterfaceType) return _unb('other');

    final el = t.element;
    if (t.isDartCoreBool) return Cls('primitive', 'bool');
    if (t.isDartCoreInt) return Cls('primitive', 'int');
    if (t.isDartCoreDouble) return Cls('primitive', 'double');
    if (t.isDartCoreNum) return Cls('primitive', 'num');
    if (t.isDartCoreString) return Cls('primitive', 'String');
    if (t.isDartCoreObject) return Cls('dynamic', 'Object');
    if (t.isDartCoreFunction) return _unb('untyped-Function');
    if (t.isDartCoreType) return _unb('Type');
    if (el is EnumElement) return Cls('enum', 'enum');

    if (t.isDartCoreList || t.isDartCoreSet || t.isDartCoreIterable) {
      final e = classify(t.typeArguments.first);
      final coll = t.isDartCoreList ? 'list' : t.isDartCoreSet ? 'set' : 'iterable';
      if (e.coll != null && e.family != 'primitive' && e.family != 'data' && e.family != 'enum') {
        return _unb('nested-collection');
      }
      return Cls(e.family, e.sub,
          ok: e.ok, partial: e.partial, data: e.data, cb: e.cb, coll: coll, elem: e);
    }
    if (t.isDartCoreMap) {
      final k = classify(t.typeArguments[0]);
      final v = classify(t.typeArguments[1]);
      final keyOk = k.coll == null &&
          (k.family == 'enum' ||
              (k.family == 'primitive' && (k.sub == 'String' || k.sub == 'int')) ||
              k.family == 'dynamic' ||
              k.family == 'generic');
      if (!keyOk) return _unb('map-key');
      return Cls(v.family, v.sub,
          ok: v.ok,
          partial: v.partial,
          data: v.data,
          cb: v.cb,
          coll: 'map',
          elem: v,
          keyType: t.typeArguments[0]);
    }
    if (t.isDartAsyncFuture || t.isDartAsyncFutureOr || t.isDartAsyncStream) {
      return _unb('future/stream');
    }

    if (el == w.widgetEl) return Cls('widget', 'slot');
    if (w.isSubtypeOfEl(t, w.widgetEl)) {
      if (el == w.preferredSizeWidgetEl) return Cls('widget', 'preferredSize');
      return Cls('widget', 'subtype', ok: false);
    }
    if (w.isSubtypeOfEl(t, w.keyEl)) {
      return el == w.keyEl || el.name == 'LocalKey'
          ? Cls('key', 'key')
          : Cls('key', el.name ?? 'key', ok: false);
    }
    if (el == w.buildContextEl ||
        w.isSubtypeOfEl(t, w.stateEl) ||
        w.isSubtypeOfEl(t, w.renderObjectEl) ||
        w.isSubtypeOfEl(t, w.elementEl)) {
      return _unb('framework-object');
    }
    if (!w.isExported(el) || el.isPrivate) return _unb('private/unexported-type');
    if (el.library.uri.toString() == 'dart:typed_data') return _unb('binary/typed-data');

    // Stateful objects -> handles.
    final name = el.name ?? '';
    final isListenable = w.isSubtypeOfEl(t, w.listenableEl);
    if (isListenable || name.endsWith('Controller') || name.endsWith('FocusNode') || name == 'LayerLink') {
      final concrete = (el is ClassElement && !el.isAbstract) ||
          w.subclassesOf(el).any((c) => c is ClassElement && !c.isAbstract && c.isPublic);
      if (!concrete) return _unb('abstract-user-subclass');
      return Cls(
          'handle',
          name.endsWith('Controller')
              ? 'controller'
              : name.contains('Focus')
                  ? 'focus'
                  : name.startsWith('Animation') || w.subclassesOf(el).any((c) => c.name == 'AnimationController') || el.allSupertypes.any((s) => s.element.name == 'Animation')
                      ? 'animation'
                      : 'listenable');
    }

    // Data classes.
    final info = DataInfo(t);
    final cls = Cls('data', 'pending', data: info);
    _memo[key] = cls; // provisional, for recursive types (coinductive)
    _fillData(info);
    if (!info.usable && codecTypes.contains(el.name)) {
      return Cls('data', 'override-only', data: info);
    }
    if (!info.usable) {
      _memo.remove(key);
      final why = info.rejected.values.toSet();
      final hasNested = why.any((r) => r.startsWith('nested:'));
      return _unb(el is ClassElement && el.isAbstract && w.subclassesOf(el).isEmpty && !el.constructors.any((c) => c.isFactory && c.isPublic)
          ? 'abstract-no-impl'
          : hasNested
              ? 'needs-nested-widget/callback'
              : 'no-usable-constructor');
    }
    final isUnion = info.variants.map((v) => v.type.element).toSet().length > 1;
    return Cls(
        'data',
        info.variants.isEmpty
            ? 'enumlike-only'
            : isUnion
                ? 'union'
                : (el is ClassElement && el.isAbstract ? 'union' : 'ctor'),
        data: info,
        partial: info.partial);
  }

  // ── data classes ─────────────────────────────────────────────────────────

  bool _okInData(Cls c) {
    if (!c.ok) return false;
    switch (c.family) {
      case 'primitive':
      case 'enum':
      case 'data':
      case 'dynamic':
      case 'generic':
        return true;
      case 'widget':
        return nested && (c.sub == 'slot' || c.sub == 'preferredSize');
      case 'handle':
        return nested && c.coll == null;
      case 'callback':
        return nested && c.coll == null && c.cb!.ret == 'void';
    }
    return false;
  }

  bool _isNestedKind(Cls c) =>
      c.family == 'widget' || c.family == 'callback' || c.family == 'builder' || c.family == 'handle';

  InterfaceType? _instantiateSub(InterfaceElement c, InterfaceType target) {
    if (c.typeParameters.isEmpty) {
      final t = c.thisType;
      return w.ts.isSubtypeOf(t, target) ? t : null;
    }
    final sup = c.thisType.asInstanceOf(target.element);
    if (sup == null) return null;
    final map = <TypeParameterElement, DartType>{};
    for (var i = 0; i < sup.typeArguments.length; i++) {
      final a = sup.typeArguments[i];
      if (a is TypeParameterType && c.typeParameters.contains(a.element)) {
        map[a.element] = target.typeArguments[i];
      }
    }
    if (map.length != c.typeParameters.length) return null;
    final t = c.instantiate(
        typeArguments: [for (final p in c.typeParameters) map[p]!],
        nullabilitySuffix: NullabilitySuffix.none);
    return w.ts.isSubtypeOf(t, target) ? t : null;
  }

  void _fillData(DataInfo info) {
    final t = info.type;
    final el = t.element;
    final candidates = <InterfaceType>[t];
    final subs = w
        .subclassesOf(el)
        .where((c) => c is ClassElement && c.isPublic && !c.metadata.hasDeprecated)
        .toList();
    if (subs.length > kMaxSubclasses) {
      info.openHierarchy = true;
    } else {
      for (final c in subs) {
        final it = _instantiateSub(c, t);
        if (it != null) candidates.add(it);
      }
    }
    for (final ct in candidates) {
      final ce = ct.element;
      if (ce is! ClassElement) continue;
      for (final ctor in ct.constructors) {
        final cname = (ctor.name == null || ctor.name == 'new') ? null : ctor.name;
        final tag = ce == el
            ? cname
            : cname == null
                ? ce.name!
                : '${ce.name}.$cname';
        final label = tag ?? 'new';
        if (ctor.isPrivate) continue;
        if (ctor.metadata.hasDeprecated) continue;
        if (ctor.metadata.hasProtected || ctor.metadata.hasVisibleForTesting || ctor.metadata.hasInternal) continue;
        if (!ctor.isFactory && ce.isAbstract) continue;
        final v = Variant(tag, ct, ctor);
        String? reject;
        var positionalCut = false;
        for (final p in ctor.formalParameters) {
          final c = classify(p.type);
          final pp = P(p, p.type, c);
          final deprecated = p.metadata.hasDeprecated;
          if (p.metadata.hasMustBeConst) {
            // e.g. IconData(codePoint): a decoded value can never be const.
            reject = '${p.name}: @mustBeConst';
            break;
          }
          if (!deprecated && _okInData(c) && !(positionalCut && p.isOptionalPositional)) {
            v.params.add(pp);
            continue;
          }
          final why = deprecated
              ? 'deprecated'
              : _isNestedKind(c)
                  ? 'nested:${c.label}'
                  : c.label;
          if (pp.mustSupply) {
            reject = '${p.name}: $why';
            break;
          }
          v.dropped[pp.name] = why;
          if (p.isRequired) v.passNull.add(pp); // required but nullable
          if (p.isOptionalPositional) positionalCut = true;
        }
        if (reject != null) {
          info.rejected[label] = reject.contains('nested:') ? 'nested:$reject' : reject;
        } else {
          info.variants.add(v);
        }
      }
    }
    // Static-const enum-likes.
    final consts = <ConstRef>[];
    for (final sc in w.staticConsts) {
      final ft = sc.field.type;
      if (ft is! InterfaceType) continue;
      final owner = sc.owner;
      final related = owner == el ||
          owner.allSupertypes.any((s) => s.element == el) ||
          _isNamespace(owner);
      if (!related) continue;
      if (owner.metadata.hasDeprecated) continue;
      if (ft.element != el && !ft.allSupertypes.any((s) => s.element == el)) continue;
      if (!w.ts.isSubtypeOf(ft, t)) continue;
      consts.add(ConstRef(owner == el ? sc.field.name! : '${owner.name}.${sc.field.name}', owner, sc.field));
    }
    info.constCount = consts.length;
    // Cap per owner so one huge namespace (Icons: ~8.9k) does not evict small ones.
    final byOwner = <InterfaceElement, List<ConstRef>>{};
    for (final c in consts) {
      (byOwner[c.owner] ??= []).add(c);
    }
    byOwner.forEach((owner, list) {
      if (list.length > maxConsts) {
        info.constsCapped = true;
      } else {
        info.consts.addAll(list);
      }
    });
  }

  final Map<InterfaceElement, bool> _nsMemo = {};
  bool _isNamespace(InterfaceElement owner) => _nsMemo[owner] ??= owner is ClassElement &&
      (owner.constructors.every((c) => c.isPrivate) ||
          (owner.isAbstract && !owner.constructors.any((c) => c.isFactory && c.isPublic) && owner.fields.every((f) => f.isStatic)));

  // ── callbacks ────────────────────────────────────────────────────────────

  Cls _callback(FunctionType f) {
    final r = f.returnType;
    String ret;
    bool isWidgety(DartType x) =>
        w.isSubtypeOfEl(x, w.widgetEl) ||
        (x is InterfaceType && (x.isDartCoreList || x.isDartCoreIterable) && w.isSubtypeOfEl(x.typeArguments.first, w.widgetEl));
    if (r is VoidType) {
      ret = 'void';
    } else if (r.isDartAsyncFuture || r.isDartAsyncFutureOr) {
      final a = (r as InterfaceType).typeArguments.first;
      ret = a is VoidType ? 'future-void' : 'future-value';
    } else if (isWidgety(r)) {
      ret = 'widget';
    } else {
      ret = 'value';
    }
    final info = CbInfo(f, ret);
    var i = 0;
    for (final p in f.formalParameters) {
      if (p.isNamed) {
        info.hasNamed = true;
        continue;
      }
      if (p.type is InterfaceType && (p.type as InterfaceType).element == w.buildContextEl) {
        info.hasContext = true;
        info.args.add(CbArg(p.name ?? 'context', p.type, Enc('context')));
        i++;
        continue;
      }
      final n = (p.name == null || p.name!.isEmpty) ? 'arg$i' : p.name!;
      info.args.add(CbArg(n, p.type, encodable(p.type)));
      i++;
    }
    final real = info.args.where((a) => a.enc.kind != 'context').toList();
    switch (ret) {
      case 'void':
        return Cls(
            'callback',
            real.isEmpty
                ? 'void()'
                : info.argsEncodable
                    ? 'void(encodable args)'
                    : 'void(unencodable args)',
            cb: info,
            ok: info.argsEncodable);
      case 'future-void':
        return Cls('callback', 'Future<void>', cb: info, ok: false);
      case 'future-value':
        return Cls('callback', 'Future<value>', cb: info, ok: false);
      case 'widget':
        return Cls(
            'builder',
            real.isEmpty
                ? 'context-only'
                : info.argsEncodable
                    ? 'encodable args'
                    : 'unencodable args',
            cb: info,
            ok: false);
      default:
        return Cls('callback', 'sync-return', cb: info, ok: false);
    }
  }

  // ── Dart -> JSON (callback arguments) ────────────────────────────────────

  Enc encodable(DartType type, [int depth = 0]) {
    final key = keyOf(type);
    final hit = _encMemo[key];
    if (hit != null) return hit;
    final t = w.ts.promoteToNonNull(type);
    Enc r;
    if (t is TypeParameterType || t is DynamicType) {
      r = Enc('generic');
    } else if (t is! InterfaceType) {
      r = Enc('none', ok: false);
    } else if (t.isDartCoreBool || t.isDartCoreInt || t.isDartCoreString || t.isDartCoreNum) {
      r = Enc('prim');
    } else if (t.isDartCoreDouble) {
      r = Enc('double');
    } else if (t.isDartCoreObject) {
      r = Enc('generic');
    } else if (t.element is EnumElement) {
      r = Enc('enum');
    } else if (t.asInstanceOf(w.material.typeProvider.iterableElement) != null) {
      // List/Set/Iterable and their subtypes (Float64List, ...)
      final e = encodable(t.asInstanceOf(w.material.typeProvider.iterableElement)!.typeArguments.first, depth + 1);
      r = Enc('coll', ok: e.ok, elem: e);
    } else if (t.isDartCoreMap ||
        t.isDartAsyncFuture ||
        t.isDartAsyncStream ||
        t.isDartCoreFunction ||
        t.isDartCoreType ||
        w.isSubtypeOfEl(t, w.widgetEl) ||
        w.isSubtypeOfEl(t, w.keyEl) ||
        w.isSubtypeOfEl(t, w.listenableEl) ||
        w.isSubtypeOfEl(t, w.stateEl) ||
        w.isSubtypeOfEl(t, w.renderObjectEl) ||
        w.isSubtypeOfEl(t, w.elementEl) ||
        t.element == w.buildContextEl ||
        !w.isExported(t.element) ||
        depth > 3) {
      r = Enc('none', ok: false);
    } else {
      r = Enc('class', ok: false);
      _encMemo[key] = r; // cycles: an in-progress type is not encodable
      // Prefer the unnamed constructor's parameters (Offset(dx, dy), not
      // Offset.fromDirection(direction, distance)).
      final names = <String>{};
      final ctors = t.element.constructors.where((c) => c.isPublic).toList();
      final unnamed = ctors.where((c) => c.name == null || c.name == 'new').toList();
      for (final c in unnamed.isNotEmpty && unnamed.first.formalParameters.isNotEmpty ? unnamed : ctors) {
        for (final p in c.formalParameters) {
          if (p.name != null) names.add(p.name!);
        }
      }
      final lib = w.material;
      final seen = <String>{};
      void consider(String n, DartType ft) {
        if (n.startsWith('_') || n == 'hashCode' || n == 'runtimeType' || !seen.add(n)) return;
        final e = encodable(ft, depth + 1);
        if (e.ok) r.fields.add((n, ft, e));
      }

      for (final n in names) {
        final g = t.lookUpGetter(n, lib, concrete: false, inherited: false) ??
            t.lookUpGetter(n, lib, inherited: true);
        if (g != null && !g.isStatic && !g.metadata.hasDeprecated) consider(n, g.returnType);
      }
      void scan(bool Function(GetterElement) pick) {
        for (final st in [t, ...t.allSupertypes]) {
          if (st.isDartCoreObject) continue;
          for (final g in st.getters) {
            if (g.isStatic || g.isPrivate || g.metadata.hasDeprecated) continue;
            if (pick(g)) consider(g.name!, g.returnType);
          }
        }
      }

      // 1. getters named like a constructor parameter (round-trippable state)
      // 2. else declared public fields  3. else every public getter
      if (r.fields.isEmpty) scan((g) => g.isOriginVariable);
      if (r.fields.isEmpty) scan((g) => true);
      r.ok = r.fields.isNotEmpty;
    }
    return _encMemo[key] = r;
  }
}
