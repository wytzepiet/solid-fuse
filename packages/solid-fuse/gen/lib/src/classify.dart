// The rule engine: how a Dart type crosses the bridge.
//
// Every rule is structural. The only names it knows are the framework roots
// in [World] (Widget, Key, Listenable, BuildContext, State, RenderObject,
// Element). A type that no rule covers throws [Skip] with a reason; callers
// drop the parameter (or the whole item when the parameter is required).
//
// Two directions:
//  * input  (JS -> Dart): widget props, constructor and method arguments
//  * output (Dart -> JS): callback arguments, getters, return values
//
// Refs are JSON maps, `{"k": kind, ...}`, with `"null": true` when nullable.
// Named types (enums, data classes, handles) are registered once in [types]
// and referenced by id.
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/nullability_suffix.dart';
import 'package:analyzer/dart/element/type.dart';

import 'dart_code.dart';
import 'docs.dart';
import 'world.dart';

typedef Json = Map<String, Object?>;

class Skip implements Exception {
  Skip(this.reason);
  final String reason;
  @override
  String toString() => reason;
}

/// Above this many exported subclasses a hierarchy is treated as open and only
/// the declared type's own constructors are offered.
const kMaxSubclasses = 40;

/// Output encoding stops this deep (Dart -> JS payloads).
const kMaxOutputDepth = 4;

class Classifier {
  Classifier(this.w, this.code);
  final World w;
  final DartCode code;


  /// id -> declaration. Ordered by first use.
  final Map<String, Json> types = {};

  final Map<String, Object> _inMemo = {}; // key -> Json | Skip
  final Map<String, Object> _outMemo = {};

  DartType nonNull(DartType t) => w.ts.promoteToNonNull(t);
  static bool isNullable(DartType t) =>
      t.nullabilitySuffix == NullabilitySuffix.question || t is DynamicType;

  String _key(DartType t) {
    final nn = nonNull(t);
    final lib = nn.element?.library?.uri.toString() ?? '';
    return '$lib|${nn.getDisplayString()}';
  }

  /// The manifest id of a named type: import uri + Dart display string.
  String idOf(InterfaceType t) {
    final lib = w.importOf(t.element);
    if (lib == null) throw Skip('not exported: ${t.element.name}');
    return '${lib.uri}#${nonNull(t).getDisplayString()}';
  }

  Json _withNull(Json r, DartType t) =>
      isNullable(t) && t is! DynamicType ? {...r, 'null': true} : r;

  // ── input ─────────────────────────────────────────────────────────────────

  Json input(DartType t) {
    if (t is TypeParameterType) {
      final b = t.element.bound;
      return _withNull({'k': 'typeParam', 'name': t.element.name, if (b != null) 'bound': code.type(b)}, t);
    }
    // A generic widget is instantiated at its bounds, so a value generic over
    // its type parameter is read at them too (`DropdownMenuEntry<T>` as
    // `DropdownMenuEntry<Object?>`).
    if (t is InterfaceType) t = _erase(t);
    final key = _key(t);
    var hit = _inMemo[key];
    if (hit == null) {
      try {
        hit = _input(nonNull(t));
      } on Skip catch (s) {
        hit = s;
      } on NotNameable catch (e) {
        hit = Skip('$e');
      }
      _inMemo[key] = hit;
    }
    if (hit is Skip) throw hit;
    return _withNull(hit as Json, t);
  }

  Json _input(DartType t) {
    if (t is DynamicType) return {'k': 'dynamic'};
    if (t is VoidType || t is NeverType || t.isDartCoreNull) throw Skip('void/Never');
    if (t is InvalidType) throw Skip('unresolved type');
    if (t is RecordType) throw Skip('record type');
    if (t is FunctionType) return _callback(t);
    if (t is! InterfaceType) throw Skip('unsupported type ${t.getDisplayString()}');

    final el = t.element;
    if (t.isDartCoreBool) return {'k': 'bool'};
    if (t.isDartCoreInt) return {'k': 'int'};
    if (t.isDartCoreDouble) return {'k': 'double'};
    if (t.isDartCoreNum) return {'k': 'num'};
    if (t.isDartCoreString) return {'k': 'String'};
    if (t.isDartCoreObject) return {'k': 'Object'};
    if (t.isDartCoreFunction) throw Skip('untyped Function');
    if (t.isDartCoreType) throw Skip('Type');
    if (el is EnumElement) return {'k': 'enum', 'id': _enum(t)};

    if (t.isDartCoreList || t.isDartCoreSet || t.isDartCoreIterable) {
      final kind = t.isDartCoreList ? 'list' : t.isDartCoreSet ? 'set' : 'iterable';
      // The element's Dart type, for the decoder's type argument.
      return {'k': kind, 'of': input(t.typeArguments.first), 'ofDart': code.type(t.typeArguments.first)};
    }
    if (t.isDartCoreMap) {
      final k = input(t.typeArguments[0]);
      return {
        'k': 'map',
        // A key JSON can't hold as an object key crosses as `[key, value]`
        // pairs.
        if (!_objectKey(k)) 'entries': true,
        'key': k,
        'of': input(t.typeArguments[1]),
        'keyDart': code.type(t.typeArguments[0]),
        'ofDart': code.type(t.typeArguments[1]),
      };
    }
    if (t.isDartAsyncFuture || t.isDartAsyncFutureOr || t.isDartAsyncStream) {
      throw Skip('Future/Stream argument (not bridged yet)');
    }

    if (el == w.widgetEl) return {'k': 'widget'};
    if (w.isSubtypeOfEl(t, w.widgetEl)) {
      // A typed slot (`PreferredSizeWidget appBar`, `List<Tab> tabs`) takes
      // the node's own widget, built where the slot is.
      if (el.isPrivate || !w.isExported(el)) throw Skip('widget slot typed ${el.name} (not exported)');
      final as = code.type(t);
      return {'k': 'widget', 'as': as.endsWith('?') ? as.substring(0, as.length - 1) : as};
    }
    if (w.isSubtypeOfEl(t, w.keyEl)) {
      if (el == w.keyEl || el == w.localKeyEl) return {'k': 'key'};
      throw Skip('${el.name} (only Key is bridged)');
    }
    // Supplied on the Dart side, never by JS: a TickerProvider (tickers run
    // while the app does), and the BuildContext the adapter builds in (a
    // constructor such as `MediaQuery.removePadding` reads inherited data
    // from where it is built).
    if (el == w.tickerProviderEl) return {'k': 'supplied', 'of': 'vsync'};
    if (el == w.buildContextEl) return {'k': 'supplied', 'of': 'context'};
    if (w.isSubtypeOfEl(t, w.stateEl) ||
        w.isSubtypeOfEl(t, w.renderObjectEl) ||
        w.isSubtypeOfEl(t, w.elementEl)) {
      throw Skip('framework object ${el.name}');
    }
    if (el.isPrivate || !w.isExported(el)) throw Skip('not exported: ${el.name}');
    if (el.library.uri.toString() == 'dart:typed_data') return {'k': 'bytes', 'as': code.ref(_bytes(el))};

    if (isHandle(t)) return {'k': 'handle', 'id': _handle(t)};
    return {'k': 'data', 'id': _data(t)};
  }

  // ── handles ───────────────────────────────────────────────────────────────

  /// Objects with identity: Listenables, and classes with mutable state that
  /// are not marked @immutable. Everything else is plain data.
  bool isHandle(InterfaceType t) {
    if (w.isSubtypeOfEl(t, w.listenableEl)) return true;
    final el = t.element;
    if (el is! ClassElement) return false;
    if (_immutable(el)) return false;
    for (final s in [el, ...el.allSupertypes.map((s) => s.element)]) {
      if (s is! ClassElement || s.library.uri.toString() == 'dart:core') continue;
      for (final f in s.fields) {
        if (!f.isStatic && f.isOriginDeclaration && !f.isFinal && !f.isConst) return true;
      }
      // Explicit setters; synthetic ones belong to the fields checked above.
      for (final setter in s.setters) {
        if (!setter.isStatic && setter.isPublic && setter.isOriginDeclaration) return true;
      }
    }
    return false;
  }

  bool _immutable(InterfaceElement el) =>
      el.metadata.hasImmutable || el.allSupertypes.any((s) => s.element.metadata.hasImmutable);

  /// Every handle type reached, by id: each gets its members
  /// ([completeHandles]), whichever way it crosses.
  final Map<String, InterfaceType> _handleTypes = {};

  String _handle(InterfaceType t) {
    final id = idOf(t);
    if (types.containsKey(id)) return id;
    _handleTypes[id] = t;
    final el = t.element;
    final decl = <String, Object?>{
      'kind': 'handle',
      'name': el.name,
      'dart': code.type(t),
      'abstract': el is ClassElement && el.isAbstract,
    };
    types[id] = decl;
    final doc = firstParagraph(el.documentationComment);
    if (doc != null) decl['doc'] = doc;
    if (el.metadata.hasDeprecated) decl['deprecated'] = true;
    // Supertypes that are handles too, so a ScrollController can go where a
    // Listenable is expected.
    decl['supertypes'] = [
      for (final s in t.allSupertypes)
        if (w.isExported(s.element) && !s.element.isPrivate && isHandle(s) && s.element != el) idOf(s),
    ];
    final ctors = <Json>[];
    final rejected = <String, String>{};
    decl['ctors'] = ctors;
    for (final c in el.constructors) {
      if (c.isPrivate || _hidden(c)) continue;
      if (!c.isFactory && el is ClassElement && el.isAbstract) continue;
      final name = c.name == null || c.name == 'new' ? null : c.name;
      try {
        ctors.add(invocable(name, c.formalParameters, deprecated: c.metadata.hasDeprecated));
      } on Skip catch (s) {
        rejected[name ?? 'new'] = s.reason;
      } on NotNameable catch (e) {
        rejected[name ?? 'new'] = '$e';
      }
    }
    if (rejected.isNotEmpty) decl['rejected'] = rejected;
    return id;
  }

  // ── shorthands ────────────────────────────────────────────────────────────

  final List<({TopLevelFunctionElement fn, InterfaceType ret, Json type, String dart, String kind, String? ts})> _shorthands = [];

  /// Registers a `@fuseShorthand` function: one required positional
  /// parameter of a kind JSON shows apart from a tagged object (bool,
  /// number, String, List), returning a non-null class type.
  void addShorthand(TopLevelFunctionElement fn, {String? ts}) {
    final ps = fn.formalParameters;
    if (ps.isEmpty || !ps.first.isRequiredPositional || ps.skip(1).any((p) => p.isRequired)) {
      throw Skip('takes one required positional parameter');
    }
    final ret = fn.returnType;
    if (ret is! InterfaceType || isNullable(ret)) throw Skip('returns a non-null class type');
    final pt = ps.first.type;
    if (isNullable(pt)) throw Skip('parameter is nullable');
    final ref = input(pt);
    final kind = switch (ref['k']) {
      'bool' => 'bool',
      'int' || 'double' || 'num' => 'number',
      'String' => 'string',
      'list' => 'list',
      _ => throw Skip('parameter is ${pt.getDisplayString()} (bool, a number, String or List)'),
    };
    _shorthands.add((fn: fn, ret: ret, type: ref, dart: code.type(pt), kind: kind, ts: ts));
  }

  /// The shorthands a value of [t] accepts: per kind, the one returning [t]
  /// itself, else the only one returning a subtype. Two candidates and no
  /// exact one is a conflict, recorded on [decl].
  List<Json> _shorthandsFor(InterfaceType t, Json decl) {
    final byKind = <String, List<({TopLevelFunctionElement fn, InterfaceType ret, Json type, String dart, String kind, String? ts})>>{};
    for (final s in _shorthands) {
      if (w.ts.isSubtypeOf(s.ret, nonNull(t))) (byKind[s.kind] ??= []).add(s);
    }
    final out = <Json>[];
    byKind.forEach((kind, list) {
      final exact = list.where((s) => s.ret.element == t.element).toList();
      final pick = exact.length == 1 ? exact.first : (exact.isEmpty && list.length == 1 ? list.first : null);
      if (pick == null) {
        ((decl['shorthandConflicts'] ??= <String, Object?>{}) as Map)[kind] = [for (final s in list) s.fn.name];
        return;
      }
      out.add({
        'kind': kind,
        'fn': code.ref(pick.fn),
        'type': pick.type,
        'dart': pick.dart,
        if (pick.ts != null) 'ts': pick.ts,
      });
    });
    return out;
  }

  // ── handle members ────────────────────────────────────────────────────────

  /// Members every object has, or every notifier: not offered.
  static const _baseClasses = {
    'Object', 'Listenable', 'ChangeNotifier', 'Diagnosticable', 'DiagnosticableTreeMixin', 'DiagnosticableTree',
  };
  static const _skipNames = {'dispose', 'notifyListeners', 'hashCode', 'runtimeType', 'toString', 'noSuchMethod', 'hasListeners'};

  bool _memberOk(ExecutableElement e) {
    if (e.isStatic || e.isPrivate || e.metadata.hasDeprecated || _hidden(e)) return false;
    // A field's annotations are on the field, not its getter and setter.
    if (e is PropertyAccessorElement && (e.variable.metadata.hasDeprecated || _hidden(e.variable))) return false;
    final name = e.name ?? '';
    if (name.isEmpty || name.startsWith('debug') || name.startsWith('toString') || _skipNames.contains(name)) return false;
    final owner = e.enclosingElement;
    // Declared by a handle class: a mixin's or an interface's members
    // (WidgetsBindingObserver's didPopRoute) are the framework's to call.
    if (owner is InterfaceElement && !isHandle(owner.thisType)) return false;
    final lib = e.library.uri.toString();
    if (owner is InterfaceElement &&
        _baseClasses.contains(owner.name) &&
        (lib == 'dart:core' || lib.startsWith('package:flutter/src/foundation/'))) {
      return false;
    }
    return true;
  }

  /// Adds the members of every handle type reached so far, and of the ones
  /// those members reach, until none is left: a handle JS gets from Dart (a
  /// callback argument, a getter) offers what a created one does.
  void completeHandles() {
    for (var done = 0; done < _handleTypes.length;) {
      final pending = [for (final MapEntry(:key, :value) in _handleTypes.entries) if (!types[key]!.containsKey('methods')) value];
      done = _handleTypes.length - pending.length;
      if (pending.isEmpty) break;
      for (final t in pending) {
        handleMembers(t);
      }
    }
  }

  /// What JS can do with a handle, added to the handle's
  /// declaration: `state` (getters JS mirrors, re-read whenever a Listenable
  /// notifies), `setters`, `methods` (each called through a Promise) and
  /// `streams` (Stream getters, read as async iterables). A member no rule
  /// covers is listed under `memberSkips`.
  void handleMembers(InterfaceType t) {
    final decl = types[idOf(t)]!;
    if (decl.containsKey('methods')) return;
    final listenable = w.isSubtypeOfEl(t, w.listenableEl);
    final state = <Json>[];
    final setters = <Json>[];
    final methods = <Json>[];
    final streams = <Json>[];
    final skips = <String, String>{};
    final seen = <String>{};
    Json out(DartType type) => output(type);

    for (final st in [t, ...t.allSupertypes]) {
      for (final g in st.getters) {
        if (!_memberOk(g) || !seen.add('get ${g.name}')) continue;
        final rt = g.returnType;
        try {
          if (rt is InterfaceType && rt.isDartAsyncStream) {
            streams.add({'name': g.name, 'type': out(rt.typeArguments.first)});
          } else if (listenable) {
            state.add({'name': g.name, 'type': out(rt)});
          }
        } on Skip catch (e) {
          skips[g.name!] = e.reason;
        } on NotNameable catch (e) {
          skips[g.name!] = '$e';
        }
      }
      for (final s in st.setters) {
        if (!_memberOk(s) || !seen.add('set ${s.name}')) continue;
        final p = s.formalParameters.first;
        try {
          setters.add({'name': s.name, 'type': input(p.type), 'dart': code.type(p.type), if (isNullable(p.type)) 'nullable': true});
        } on Skip catch (e) {
          skips['${s.name}='] = e.reason;
        } on NotNameable catch (e) {
          skips['${s.name}='] = '$e';
        }
      }
      for (final m in st.methods) {
        if (!_memberOk(m) || m.isOperator || !seen.add('${m.name}()')) continue;
        try {
          if (m.typeParameters.isNotEmpty) throw Skip('generic method');
          final inv = invocable(m.name, m.formalParameters);
          final r = m.returnType;
          var isAsync = false;
          Json ret;
          if (r is VoidType) {
            ret = {'k': 'void'};
          } else if (r is InterfaceType && (r.isDartAsyncFutureOr || r.asInstanceOf(w.tp.futureElement) != null)) {
            // A Future, or a subtype such as TickerFuture.
            isAsync = true;
            final a = (r.isDartAsyncFutureOr ? r : r.asInstanceOf(w.tp.futureElement)!).typeArguments.first;
            ret = a is VoidType || a.isDartCoreNull ? {'k': 'void'} : out(a);
          } else {
            ret = out(r);
          }
          inv['ret'] = ret;
          if (isAsync) inv['async'] = true;
          if (firstParagraph(m.documentationComment) case final d?) inv['doc'] = d;
          methods.add(inv);
        } on Skip catch (e) {
          skips['${m.name}()'] = e.reason;
        } on NotNameable catch (e) {
          skips['${m.name}()'] = '$e';
        }
      }
    }
    final dispose = t.lookUpMethod('dispose', t.element.library);
    decl['state'] = state;
    decl['setters'] = setters;
    decl['methods'] = methods;
    decl['streams'] = streams;
    if (dispose != null && dispose.formalParameters.every((p) => !p.isRequired)) decl['disposable'] = true;
    if (skips.isNotEmpty) decl['memberSkips'] = skips;
  }

  // ── enums ─────────────────────────────────────────────────────────────────

  String _enum(InterfaceType t) {
    final id = idOf(t);
    if (types.containsKey(id)) return id;
    final el = t.element as EnumElement;
    types[id] = {
      'kind': 'enum',
      'name': el.name,
      'dart': code.type(t),
      if (firstParagraph(el.documentationComment) case final d?) 'doc': d,
      if (el.metadata.hasDeprecated) 'deprecated': true,
      'values': [
        for (final c in el.constants)
          if (c.isPublic) c.metadata.hasDeprecated ? {'name': c.name, 'deprecated': true} : c.name,
      ],
    };
    return id;
  }

  // ── data classes ──────────────────────────────────────────────────────────

  static bool _hidden(Element e) =>
      e.metadata.hasProtected || e.metadata.hasVisibleForTesting || e.metadata.hasInternal;

  final Set<String> _filling = {};

  String _data(InterfaceType t) {
    final id = idOf(t);
    final existing = types[id];
    if (existing != null) {
      if (existing['inputSkipped'] case final String why) throw Skip(why);
      // Filled, or being filled further up the stack (recursive types such as
      // Border -> BorderSide refer to themselves instead of looping).
      if (existing.containsKey('variants') || _filling.contains(id)) return id;
    }
    final el = t.element;
    final decl = existing ??
        <String, Object?>{
          'kind': 'data',
          'name': el.name,
          'dart': code.type(t),
        };
    types[id] = decl;
    decl['abstract'] = el is ClassElement && el.isAbstract;
    if (firstParagraph(el.documentationComment) case final d?) decl['doc'] = d;
    if (el.metadata.hasDeprecated) decl['deprecated'] = true;
    _filling.add(id);
    try {
      final variants = <Json>[];
      final rejected = <String, String>{};
      final candidates = <InterfaceType>[t];
      final subs = [
        for (final c in w.subclassesOf(el))
          if (c is ClassElement && c.isPublic && !_hidden(c)) c,
      ];
      if (subs.length > kMaxSubclasses) {
        decl['openHierarchy'] = subs.length;
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
          if (ctor.isPrivate || _hidden(ctor)) continue;
          if (!ctor.isFactory && ce.isAbstract) continue;
          final cname = (ctor.name == null || ctor.name == 'new') ? null : ctor.name;
          // Tags are absolute (`EdgeInsets.symmetric`, `Point` for an
          // unnamed constructor), so one value decodes the same wherever it
          // goes: under EdgeInsets and under EdgeInsetsGeometry.
          final tag = cname == null ? ce.name! : '${ce.name}.$cname';
          try {
            final v = invocable(cname, ctor.formalParameters, deprecated: ctor.metadata.hasDeprecated);
            v['tag'] = tag;
            if (ce != el) v['class'] = code.type(ct);
            variants.add(v);
          } on Skip catch (s) {
            rejected[tag] = s.reason;
          } on NotNameable catch (e) {
            rejected[tag] = '$e';
          }
        }
      }
      final consts = _consts(t, el, decl);
      final shorthands = _shorthandsFor(t, decl);
      if (shorthands.isNotEmpty) decl['shorthands'] = shorthands;
      // A plain object is the unnamed constructor's when there is one.
      final implement = variants.any((v) => v['tag'] == el.name) ? null : _implement(t, el, decl);
      if (implement != null) decl['implement'] = implement;
      if (variants.isEmpty && consts.isEmpty && shorthands.isEmpty && implement == null) {
        final why = rejected.isEmpty
            ? (el is ClassElement && el.isAbstract ? 'abstract, no constructible subtype' : 'no public constructor')
            : 'no usable constructor (${rejected.entries.map((e) => '${e.key}: ${e.value}').join('; ')})';
        decl['inputSkipped'] = why;
        throw Skip(why);
      }
      decl['variants'] = variants;
      decl['consts'] = consts;
      if (rejected.isNotEmpty) decl['rejected'] = rejected;
      return id;
    } finally {
      _filling.remove(id);
    }
  }

  /// How JS implements abstract class [t] (a delegate, a formatter): an
  /// object with a function per abstract member, which a generated subclass
  /// calls. Null when it can't: the class can't be extended from another
  /// library, has no constructor without required parameters, or has an
  /// abstract member no callback can stand for (a setter, a generic or
  /// private one, a parameter that isn't required and positional).
  Json? _implement(InterfaceType t, InterfaceElement el, Json decl) {
    if (el is! ClassElement || !el.isAbstract || el.isSealed || el.isFinal || el.isInterface) return null;
    if (el.isPrivate || !w.isExported(el)) return null;
    // F-bounded (`ThemeExtension<T extends ThemeExtension<T>>`): no bound to
    // instantiate the subclass at.
    for (final tp in el.typeParameters) {
      final b = tp.bound;
      if (b != null && el.typeParameters.any((o) => _mentions(b, o))) return null;
    }
    ConstructorElement? ctor;
    for (final c in el.constructors) {
      if (c.isFactory || c.isPrivate || _hidden(c)) continue;
      if (c.formalParameters.any((p) => p.isRequired)) continue;
      final named = c.name != null && c.name != 'new';
      if (ctor == null || !named) ctor = c;
    }
    if (ctor == null) return null;
    final lib = el.library;
    final members = <Json>[];
    final seen = <String>{};
    String? why;
    for (final st in [t, ...t.allSupertypes]) {
      if (st.isDartCoreObject) continue;
      for (final m in st.setters) {
        if (!m.isStatic && t.lookUpSetter(m.name!, lib, concrete: true) == null) why ??= 'abstract setter ${m.name}';
      }
      for (final g in st.getters) {
        final n = g.name!;
        if (g.isStatic || !seen.add('get $n') || t.lookUpGetter(n, lib, concrete: true) != null) continue;
        if (n.startsWith('_')) {
          why ??= 'private member $n';
          continue;
        }
        try {
          final ret = input(g.returnType);
          if (_typedWidget(ret)) throw Skip('returns a typed widget');
          if (ret['k'] == 'supplied') throw Skip('returns a ${ret['of']}');
          members.add({
            'name': n,
            'getter': true,
            'params': <Json>[],
            'ret': code.type(g.returnType),
            'fn': {'k': 'fn', 'args': <Json>[], 'ret': ret, 'sync': true, 'dart': '${code.type(g.returnType)} Function()'},
          });
        } on Skip catch (s) {
          why ??= '$n: ${s.reason}';
        } on NotNameable catch (e) {
          why ??= '$n: $e';
        }
      }
      for (final m in st.methods) {
        final n = m.name!;
        if (m.isStatic || !seen.add(n) || t.lookUpMethod(n, lib, concrete: true) != null) continue;
        if (n.startsWith('_')) {
          why ??= 'private member $n';
          continue;
        }
        try {
          if (m.typeParameters.isNotEmpty) throw Skip('generic method');
          if (!m.formalParameters.every((p) => p.isRequiredPositional)) throw Skip('optional or named parameters');
          members.add({
            'name': n,
            'params': [
              for (final p in m.formalParameters) {'name': p.name ?? 'arg', 'dart': code.type(p.type)},
            ],
            'ret': code.type(m.returnType),
            'fn': _callback(m.type),
          });
        } on Skip catch (s) {
          why ??= '$n: ${s.reason}';
        } on NotNameable catch (e) {
          why ??= '$n: $e';
        }
      }
    }
    if (why != null) {
      decl['implementSkipped'] = why;
      return null;
    }
    if (members.isEmpty) return null;
    final cname = ctor.name == null || ctor.name == 'new' ? null : ctor.name;
    return {'ctor': ?cname, 'members': members};
  }

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
      nullabilitySuffix: NullabilitySuffix.none,
    );
    return w.ts.isSubtypeOf(t, target) ? t : null;
  }

  /// Static constants of type [t] on [el], its subclasses and namespace
  /// classes: `Colors.red`, `Curves.easeIn`, `Alignment.center`.
  List<Json> _consts(InterfaceType t, InterfaceElement el, Json decl) {
    final owners = <InterfaceElement>{el, ...w.subclassesOf(el), ...w.namespaces};
    final out = <Json>[];
    for (final owner in owners) {
      if (owner.metadata.hasDeprecated || owner.isPrivate || !w.isExported(owner)) continue;
      for (final f in owner.fields) {
        if (!f.isStatic || !f.isConst || !f.isPublic || f.isEnumConstant) continue;
        final ft = f.type;
        if (ft is! InterfaceType || ft.nullabilitySuffix == NullabilitySuffix.question) continue;
        if (ft.element != el && ft.asInstanceOf(el) == null) continue;
        if (!w.ts.isSubtypeOf(ft, t)) continue;
        out.add({
          'name': '${owner.name}.${f.name}',
          'dart': '${code.ref(owner)}.${f.name}',
          if (f.metadata.hasDeprecated) 'deprecated': true,
        });
      }
    }
    return out;
  }

  // ── parameters ────────────────────────────────────────────────────────────

  /// A constructor / function / method signature as manifest params, in
  /// declared order. A parameter no rule covers is kept with `skip` (so
  /// emitters still know positional order); throws when such a parameter must
  /// be supplied.
  Json invocable(String? name, List<FormalParameterElement> params, {bool deprecated = false}) {
    final out = <Json>[];
    var positionalCut = false;
    for (final p in params) {
      out.add(param(p, positionalCut: positionalCut));
      if (out.last.containsKey('skip') && p.isOptionalPositional) positionalCut = true;
    }
    return {'name': ?name, if (deprecated) 'deprecated': true, 'params': out};
  }

  Json param(FormalParameterElement p, {bool positionalCut = false}) {
    final nullable = isNullable(p.type);
    final base = <String, Object?>{
      'name': p.name ?? '_',
      'named': p.isNamed,
      'required': p.isRequired,
      if (nullable) 'nullable': true,
      if (p.metadata.hasDeprecated) 'deprecated': true,
    };
    if (firstParagraph(p.documentationComment) case final d?) base['doc'] = d;
    final mustSupply = p.isRequired && !nullable;
    String? reason;
    Json? ref;
    if (p.metadata.hasMustBeConst) {
      reason = '@mustBeConst';
    } else if (positionalCut && p.isOptionalPositional) {
      reason = 'follows a skipped positional parameter';
    } else {
      try {
        ref = input(p.type);
      } on Skip catch (s) {
        reason = s.reason;
      }
    }
    if (ref != null && !p.isRequired) {
      if (code.hasDefault(p)) {
        final d = code.defaultOf(p);
        if (d == null) {
          // A named one is left out when JS doesn't give it, so Dart's
          // default applies.
          if (p.isNamed) {
            base['omit'] = true;
          } else {
            reason = 'default value cannot be named from generated code';
          }
        } else {
          base['default'] = d;
          final j = code.defaultJson(p);
          if (j != null) base['defaultValue'] = j;
        }
      } else if (!nullable) {
        reason = 'optional, non-nullable, no default';
      }
    }
    if (reason != null) {
      if (mustSupply) throw Skip('${p.name}: $reason');
      return {...base, 'skip': reason, if (p.isRequired) 'passNull': true};
    }
    try {
      base['dart'] = code.type(p.type);
    } on NotNameable catch (e) {
      if (mustSupply) throw Skip('${p.name}: $e');
      return {...base, 'skip': '$e', if (p.isRequired) 'passNull': true};
    }
    return {...base, 'type': ref};
  }

  // ── callbacks ─────────────────────────────────────────────────────────────

  Json _callback(FunctionType f) {
    if (f.typeParameters.isNotEmpty) throw Skip('generic callback');
    final args = <Json>[];
    var context = false;
    var i = 0;
    for (final p in f.formalParameters) {
      // An optional one needs a default in the closure, which can't name it.
      if (p.isOptional && p.type.nullabilitySuffix != NullabilitySuffix.question && p.type is! DynamicType) {
        throw Skip('callback with an optional non-nullable parameter');
      }
      final pt = p.type;
      final flags = <String, Object?>{
        if (p.isNamed) 'named': true,
        if (p.isRequiredNamed) 'required': true,
        if (p.isOptionalPositional) 'optional': true,
      };
      if (pt is InterfaceType && pt.element == w.buildContextEl) {
        context = true;
        args.add({'name': p.name ?? 'context', 'type': {'k': 'supplied', 'of': 'context'}, ...flags});
        i++;
        continue;
      }
      final n = (p.name == null || p.name!.isEmpty) ? 'arg$i' : p.name!;
      Json t;
      try {
        t = output(pt);
      } on Skip catch (s) {
        // Dart still passes it; JS gets undefined.
        t = {'k': 'omitted', 'reason': s.reason};
      }
      args.add({'name': n, 'type': t, ...flags});
      i++;
    }
    final r = f.returnType;
    Json ret;
    var isAsync = false;
    if (r is VoidType) {
      ret = {'k': 'void'};
    } else if (r is InterfaceType && (r.isDartAsyncFuture || r.isDartAsyncFutureOr)) {
      isAsync = true;
      final a = r.typeArguments.first;
      ret = a is VoidType ? {'k': 'void'} : input(a);
    } else {
      ret = input(r);
    }
    // A typed widget is built where its slot is, during a build; a callback
    // returns its widget later or in a JS root of its own.
    if (_typedWidget(ret)) throw Skip('callback returns a typed widget');
    if (ret['k'] == 'supplied') throw Skip('callback returns a ${ret['of']}');
    final sync = !isAsync && ret['k'] != 'void';
    return {
      'k': 'fn',
      'args': args,
      'ret': ret,
      if (context) 'context': true,
      if (isAsync) 'async': true,
      // A synchronous return value needs a synchronous Dart -> JS call.
      if (sync) 'sync': true,
      'dart': code.type(f),
    };
  }

  /// Map keys that are object keys on the wire (as strings).
  static bool _objectKey(Json k) =>
      const {'String', 'int', 'enum', 'dynamic', 'Object', 'typeParam'}.contains(k['k']) && k['null'] != true;

  static const _byteKinds = {
    'Uint8List', 'Uint8ClampedList', 'Int8List', 'Uint16List', 'Int16List', 'Uint32List', 'Int32List',
    'Uint64List', 'Int64List', 'Float32List', 'Float64List', 'ByteData',
  };

  /// The typed-data class a `bytes` ref is read as.
  static InterfaceElement _bytes(InterfaceElement el) {
    if (!_byteKinds.contains(el.name)) throw Skip('typed data ${el.name}');
    return el;
  }

  static bool _mentions(DartType t, TypeParameterElement p) => switch (t) {
    TypeParameterType() => t.element == p,
    InterfaceType() => t.typeArguments.any((a) => _mentions(a, p)),
    _ => false,
  };

  static bool _typedWidget(Object? ref) {
    if (ref is! Map) return false;
    return switch (ref['k']) {
      'widget' => ref['as'] != null,
      'list' || 'set' || 'iterable' || 'map' => _typedWidget(ref['of']),
      _ => false,
    };
  }

  // ── output ────────────────────────────────────────────────────────────────

  Json output(DartType t, [int depth = 0]) {
    if (t is TypeParameterType || t is DynamicType) return {'k': 'dynamic'};
    if (t is InterfaceType) t = _erase(t);
    final key = _key(t);
    var hit = _outMemo[key];
    if (hit == null) {
      try {
        hit = _output(nonNull(t), depth);
      } on Skip catch (s) {
        hit = s;
      } on NotNameable catch (e) {
        hit = Skip('$e');
      }
      _outMemo[key] = hit;
    }
    if (hit is Skip) throw hit;
    return _withNull(hit as Json, t);
  }

  /// [t] with type parameters in its arguments replaced by their bounds
  /// (`AsyncSnapshot<T>` is `AsyncSnapshot<Object?>`): the same instantiation
  /// a generic widget gets, and the only one a top-level decoder or encoder
  /// can name.
  InterfaceType _erase(InterfaceType t) {
    if (t.typeArguments.isEmpty) return t;
    DartType arg(DartType a) => switch (a) {
      TypeParameterType() => a.element.bound ?? w.tp.objectQuestionType,
      InterfaceType() => _erase(a),
      _ => a,
    };
    final args = [for (final a in t.typeArguments) arg(a)];
    var same = true;
    for (var i = 0; i < args.length; i++) {
      if (!identical(args[i], t.typeArguments[i])) same = false;
    }
    return same ? t : t.element.instantiate(typeArguments: args, nullabilitySuffix: t.nullabilitySuffix);
  }

  Json _output(DartType t, int depth) {
    if (t is! InterfaceType) throw Skip('unsupported type ${t.getDisplayString()}');
    final el = t.element;
    if (t.isDartCoreBool) return {'k': 'bool'};
    if (t.isDartCoreInt) return {'k': 'int'};
    if (t.isDartCoreDouble) return {'k': 'double'};
    if (t.isDartCoreNum) return {'k': 'num'};
    if (t.isDartCoreString) return {'k': 'String'};
    if (t.isDartCoreObject) return {'k': 'dynamic'};
    if (el is EnumElement) return {'k': 'enum', 'id': _enum(t)};
    // Before iterables: a Uint8List is a List<int> too.
    if (el.library.uri.toString() == 'dart:typed_data') return {'k': 'bytes', 'as': code.ref(_bytes(el))};
    final iter = t.asInstanceOf(w.tp.iterableElement);
    if (iter != null) return {'k': 'list', 'of': output(iter.typeArguments.first, depth + 1)};
    if (t.isDartCoreMap) {
      final k = output(t.typeArguments[0], depth + 1);
      return {'k': 'map', if (!_objectKey(k)) 'entries': true, 'key': k, 'of': output(t.typeArguments[1], depth + 1)};
    }
    if (t.isDartAsyncFuture || t.isDartAsyncStream) throw Skip('Future/Stream value');
    if (t.isDartCoreFunction || t.isDartCoreType) throw Skip('${el.name} value');
    if (w.isSubtypeOfEl(t, w.widgetEl)) throw Skip('widget value');
    if (w.isSubtypeOfEl(t, w.keyEl)) throw Skip('key value');
    if (el == w.buildContextEl ||
        w.isSubtypeOfEl(t, w.stateEl) ||
        w.isSubtypeOfEl(t, w.renderObjectEl) ||
        w.isSubtypeOfEl(t, w.elementEl)) {
      throw Skip('framework object ${el.name}');
    }
    if (el.isPrivate || !w.isExported(el)) throw Skip('not exported: ${el.name}');
    if (isHandle(t)) return {'k': 'handle', 'id': _handle(t)};
    if (depth > kMaxOutputDepth) throw Skip('nested too deep');
    return {'k': 'data', 'id': _outData(t, depth)};
  }

  final Set<String> _outInProgress = {};

  /// Fields a data value is encoded with: getters named like a constructor
  /// parameter (state that round-trips), else declared fields, else every
  /// public getter.
  String _outData(InterfaceType t, int depth) {
    final id = idOf(t);
    final decl = types[id] ??= {'kind': 'data', 'name': t.element.name, 'dart': code.type(t)};
    if (decl['outputSkipped'] case final String why) throw Skip(why);
    if (decl.containsKey('fields') || !_outInProgress.add(id)) return id;
    try {
      final names = <String>{};
      final ctors = t.element.constructors.where((c) => c.isPublic).toList();
      final unnamed = ctors.where((c) => c.name == null || c.name == 'new').toList();
      for (final c in unnamed.isNotEmpty && unnamed.first.formalParameters.isNotEmpty ? unnamed : ctors) {
        for (final p in c.formalParameters) {
          if (p.name != null) names.add(p.name!);
        }
      }
      final lib = t.element.library;
      final fields = <Json>[];
      final seen = <String>{};
      void consider(String n, DartType ft) {
        if (n.startsWith('_') || n == 'hashCode' || n == 'runtimeType' || !seen.add(n)) return;
        try {
          fields.add({'name': n, 'type': output(ft, depth + 1)});
        } on Skip {
          // field not encodable: left out of the payload
        }
      }

      for (final n in names) {
        final g = t.lookUpGetter(n, lib);
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

      if (fields.isEmpty) scan((g) => g.isOriginVariable);
      if (fields.isEmpty) scan((g) => true);
      if (fields.isEmpty) {
        decl['outputSkipped'] = 'no encodable fields';
        throw Skip('no encodable fields on ${t.element.name}');
      }
      decl['fields'] = fields;
    } finally {
      _outInProgress.remove(id);
    }
    return id;
  }
}
