// Builds the manifest: the one JSON file the emitters (in the fuse CLI) turn
// into TypeScript and Dart adapters. Nothing here ever throws for a single
// item: an item that cannot be bridged lands in `skipped` with a reason.
import 'dart:convert';

import 'package:analyzer/dart/element/element.dart';
import 'package:crypto/crypto.dart';

import 'barrels.dart';
import 'classify.dart';
import 'config.dart';
import 'dart_code.dart';
import 'docs.dart';
import 'world.dart';

/// Bumped whenever the manifest shape changes.
const manifestFormat = 1;

/// Bumped whenever the generator's output for the same input can change.
/// Part of the input hash.
const generatorVersion = '0.5.0';

class ManifestBuilder {
  ManifestBuilder(this.w, this.config, {this.values = const []}) : code = DartCode(w) {
    c = Classifier(w, code);
  }

  final World w;
  final GenConfig config;
  final DartCode code;

  /// Classes a barrel names in a `show`: the value types among them get a
  /// registered decoder ([_valueRoots]).
  final List<ClassElement> values;
  late final Classifier c;

  final List<Json> _widgets = [];
  final List<Json> _skipped = [];
  final Set<String> _handleRoots = {};
  /// Static methods and top-level functions JS calls, by owner.
  final List<Json> _statics = [];
  /// Classes with a replaceable shared instance (a plugin's platform
  /// interface) that JS can fake.
  final List<Json> _fakes = [];
  /// One entry per Dart declaration, however many barrels export it.
  final Set<Element> _seenStatic = {};
  /// Value types a barrel names (`show Color`): hand-written Dart decodes
  /// them with `node.value<Color>(...)`, through the decoder the app
  /// generates and registers.
  final Set<String> _valueRoots = {};

  void _skip(String item, String reason) => _skipped.add({'item': item, 'reason': reason});

  Json build() {
    w.loadErrors.forEach((uri, why) {
      if (config.libraries.containsKey(uri)) _skip(uri, 'library did not load: $why');
    });
    // Shorthands first: data types pick them up as they are classified.
    config.libraries.forEach((uri, rule) {
      final lib = w.library(uri);
      if (lib != null && rule.shorthands.isNotEmpty) _shorthands(lib, rule.shorthands);
    });
    config.libraries.forEach((uri, rule) {
      final lib = w.library(uri);
      if (lib == null || (rule.allow?.isEmpty ?? false)) return;
      _library(lib, rule);
    });
    for (final cls in values) {
      if (cls.typeParameters.isNotEmpty || w.isSubtypeOfEl(cls.thisType, w.widgetEl) || c.isHandle(cls.thisType)) continue;
      final item = '${cls.library.uri}#${cls.name}';
      try {
        final ref = c.input(cls.thisType);
        if (ref['k'] == 'data') _valueRoots.add(ref['id']! as String);
      } on Skip catch (s) {
        _skip(item, s.reason);
      } on NotNameable catch (e) {
        _skip(item, '$e');
      }
    }
    c.completeHandles();
    _prune();
    final types = Map.fromEntries(c.types.entries.toList()..sort((a, b) => a.key.compareTo(b.key)));
    final body = <String, Object?>{
      'widgets': _widgets,
      'handles': _handleRoots.toList()..sort(),
      'values': _valueRoots.toList()..sort(),
      'statics': _statics,
      'fakes': _fakes,
      'types': types,
    };
    return {
      'format': manifestFormat,
      'generator': generatorVersion,
      // Identifies the bridged surface; the runtime compares it with the JS
      // bundle's copy at startup.
      'fingerprint': sha256.convert(utf8.encode(jsonEncode(body))).toString().substring(0, 16),
      'imports': [
        for (final e in w.entries)
          if (code.used.contains(e) && e.prefix.isNotEmpty) {'uri': e.uri, 'prefix': e.prefix},
      ],
      ...body,
      'skipped': _skipped,
    };
  }

  // ── shorthands ────────────────────────────────────────────────────────────

  void _shorthands(EntryLib lib, Set<String> names) {
    lib.element.exportNamespace.definedNames2.forEach((name, el) {
      if (el is! TopLevelFunctionElement || !names.contains(name)) return;
      final a = fuseAnnotation(el, 'FuseShorthand');
      if (a == null) return;
      try {
        c.addShorthand(el, ts: a.getField('ts')?.toStringValue());
      } on Skip catch (s) {
        _skip('${lib.uri}#$name', 'shorthand: ${s.reason}');
      } on NotNameable catch (e) {
        _skip('${lib.uri}#$name', 'shorthand: $e');
      }
    });
  }

  // ── selection ─────────────────────────────────────────────────────────────

  /// Classes declared by the package [lib] belongs to (a library that
  /// re-exports Flutter does not re-export Flutter's widgets).
  bool _ownedBy(Element el, EntryLib lib) {
    final declared = el.library?.uri;
    final target = Uri.parse(lib.uri);
    if (declared == null) return false;
    if (target.scheme == 'dart') return declared.scheme == 'dart';
    return declared.scheme == 'package' && declared.pathSegments.first == target.pathSegments.first;
  }

  void _library(EntryLib lib, LibraryRule rule) {
    final classes = <ClassElement>[];
    lib.element.exportNamespace.definedNames2.forEach((name, el) {
      if (el is! ClassElement || !el.isPublic || !_ownedBy(el, lib)) return;
      if (w.platformOnly(lib.element).contains(el)) return _skip('${lib.uri}#$name', 'differs per platform (a conditional export)');
      if (el.metadata.hasVisibleForTesting) return _skip('${lib.uri}#$name', 'only for tests (@visibleForTesting)');
      classes.add(el);
    });
    classes.sort((a, b) => a.name!.compareTo(b.name!));
    _functions(lib, rule);
    // A class name wins over a named constructor that would spell the same
    // component (PositionedDirectional vs Positioned.directional).
    final components = <String, String>{
      for (final cls in classes)
        if (!cls.isAbstract && w.isSubtypeOfEl(cls.thisType, w.widgetEl)) cls.name!: '',
    };
    for (final cls in classes) {
      final name = cls.name!;
      if (rule.includes(name) && c.staticsOnly(cls)) {
        if (_seenStatic.add(cls)) _staticOwner(lib, cls);
        continue;
      }
      if (!rule.includes(name)) {
        // Only a named constructor is allowed (`Image.network`): no statics.
      } else if (c.fakeSetter(cls) case final setter? when _seenStatic.add(cls)) {
        try {
          _fakes.add({'id': '${lib.uri}#$name', ...c.fake(cls, setter)});
        } on Skip catch (s) {
          _skip('${lib.uri}#$name', 'fake: ${s.reason}');
        } catch (e) {
          _skip('${lib.uri}#$name', 'fake: internal error: $e');
        }
      }
      final isWidget = !cls.isAbstract && w.isSubtypeOfEl(cls.thisType, w.widgetEl);
      if (isWidget) {
        for (final ctor in cls.constructors) {
          if (ctor.isPrivate) continue;
          final cname = (ctor.name == null || ctor.name == 'new') ? null : ctor.name;
          if (!rule.includes(name, cname)) continue;
          final item = '${lib.uri}#$name${cname == null ? '' : '.$cname'}';
          try {
            final wj = _widget(lib, cls, ctor, cname);
            final comp = wj['component']! as String;
            final clash = components[comp];
            if (clash != null && (cname != null || clash.isNotEmpty)) {
              _skip(item, 'component name $comp is taken by ${clash.isEmpty ? 'the class $comp' : clash}');
              continue;
            }
            components[comp] = item;
            _widgets.add(wj);
          } on Skip catch (s) {
            _skip(item, s.reason);
          } on NotNameable catch (e) {
            _skip(item, '$e');
          } catch (e) {
            // A bug in the generator, never in the user's code: still not fatal.
            _skip(item, 'internal error: $e');
          }
        }
        continue;
      }
      // Handles: the Listenables the package declares (controllers,
      // notifiers, focus nodes) and the objects that own their identity
      // (HeroController, a NavigatorObserver) when the allow list is empty; any handle
      // class the allow list names. Handles that widget parameters reach are
      // in the manifest either way.
      final named = rule.explicitlyAllows(name) && rule.includes(name);
      final listenable = rule.allowsAll &&
          rule.includes(name) &&
          (w.isSubtypeOfEl(cls.thisType, w.listenableEl) || c.ownsIdentity(cls.thisType));
      if (!named && !listenable) continue;
      try {
        final t = cls.thisType;
        if (cls.typeParameters.isNotEmpty || !c.isHandle(t)) {
          if (rule.explicitlyAllows(name)) {
            _skip('${lib.uri}#$name', cls.typeParameters.isNotEmpty ? 'generic class (not bridged yet)' : 'not a widget or handle');
          }
          continue;
        }
        final ref = c.input(t);
        final id = ref['id']! as String;
        if ((c.types[id]!['ctors']! as List).isEmpty) {
          if (rule.explicitlyAllows(name)) _skip('${lib.uri}#$name', 'no public constructor');
          continue;
        }
        c.handleMembers(t);
        _handleRoots.add(id);
      } on Skip catch (s) {
        if (rule.explicitlyAllows(name)) _skip('${lib.uri}#$name', s.reason);
      } catch (e) {
        _skip('${lib.uri}#$name', 'internal error: $e');
      }
    }
  }

  // ── statics ───────────────────────────────────────────────────────────────

  /// The library's own top-level functions (sensors_plus's
  /// `accelerometerEventStream`), as functions JS calls.
  void _functions(EntryLib lib, LibraryRule rule) {
    final methods = <Json>[];
    final names = <String>[];
    lib.element.exportNamespace.definedNames2.forEach((name, el) {
      if (el is! TopLevelFunctionElement || !el.isPublic || !_ownedBy(el, lib) || !rule.includes(name)) return;
      if (w.platformOnly(lib.element).contains(el)) return _skip('${lib.uri}#$name', 'function: differs per platform (a conditional export)');
      names.add(name);
    });
    names.sort();
    for (final name in names) {
      final el = lib.element.exportNamespace.definedNames2[name]! as TopLevelFunctionElement;
      if (fuseAnnotation(el, 'FuseShorthand') != null || name == 'main' || name.startsWith('debug')) continue;
      if (el.metadata.hasVisibleForTesting || el.metadata.hasInternal || el.metadata.hasDeprecated || !_seenStatic.add(el)) continue;
      final item = '${lib.uri}#$name';
      try {
        methods.add({...c.staticFn(el, name), 'dart': code.ref(el)});
      } on Skip catch (s) {
        _skip(item, 'function: ${s.reason}');
      } on NotNameable catch (e) {
        _skip(item, 'function: $e');
      } catch (e) {
        _skip(item, 'function: internal error: $e');
      }
    }
    if (methods.isNotEmpty) _statics.add({'id': '${lib.uri}#', 'methods': methods});
  }

  /// A class of only statics (`Geolocator`): its static methods.
  void _staticOwner(EntryLib lib, ClassElement cls) {
    final methods = <Json>[];
    final owner = code.ref(cls);
    for (final m in [...cls.methods]..sort((a, b) => a.name!.compareTo(b.name!))) {
      if (!m.isStatic || !m.isPublic || m.metadata.hasProtected || m.metadata.hasVisibleForTesting || m.metadata.hasDeprecated) continue;
      if (m.name!.startsWith('debug')) continue;
      final item = '${lib.uri}#${cls.name}.${m.name}';
      try {
        methods.add({...c.staticFn(m, m.name!), 'dart': '$owner.${m.name}'});
      } on Skip catch (s) {
        _skip(item, 'function: ${s.reason}');
      } on NotNameable catch (e) {
        _skip(item, 'function: $e');
      } catch (e) {
        _skip(item, 'function: internal error: $e');
      }
    }
    if (methods.isEmpty) return;
    _statics.add({
      'id': '${lib.uri}#${cls.name}',
      'owner': cls.name,
      if (firstParagraph(cls.documentationComment) case final d?) 'doc': d,
      'methods': methods,
    });
  }

  // ── widgets ───────────────────────────────────────────────────────────────

  static String _cap(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

  Json _widget(EntryLib lib, ClassElement cls, ConstructorElement ctor, String? cname) {
    final name = cls.name!;
    final sig = c.invocable(cname, ctor.formalParameters, deprecated: ctor.metadata.hasDeprecated || cls.metadata.hasDeprecated);
    final params = (sig['params']! as List).cast<Json>();
    Json? find(bool Function(Json p) f) => params.where((p) => p.containsKey('type') && f(p)).firstOrNull;
    bool isWidget(Object? t) => t is Map && t['k'] == 'widget';
    bool isWidgetList(Object? t) => t is Map && t['k'] == 'list' && isWidget(t['of']);

    // JSX children: `child` / `sliver` (one) or `children` / `slivers` (many).
    final many = find((p) => (p['name'] == 'children' || p['name'] == 'slivers') && isWidgetList(p['type']));
    final one = find((p) => (p['name'] == 'child' || p['name'] == 'sliver') && isWidget(p['type']));
    final children = many != null
        ? {'param': many['name'], 'many': true}
        : one != null
            ? {'param': one['name'], 'many': false}
            : null;
    final id = '${lib.uri}#$name${cname == null ? '' : '.$cname'}';
    return {
      'id': id,
      'component': '$name${_cap(cname ?? '')}',
      'class': name,
      'ctor': ?cname,
      'dart': code.ref(cls),
      if (sig['deprecated'] == true) 'deprecated': true,
      if (firstParagraph(ctor.documentationComment) ?? firstParagraph(cls.documentationComment) case final d?) 'doc': d,
      if (cls.typeParameters.isNotEmpty)
        'typeParams': [
          for (final tp in cls.typeParameters)
            {'name': tp.name, if (tp.bound != null) 'bound': code.type(tp.bound!)},
        ],
      'params': params,
      'children': ?children,
    };
  }

  // ── consistency ───────────────────────────────────────────────────────────

  static const _notPlain = {'fn', 'widget', 'supplied'};

  /// Whether [ref] can hold one of [kinds], through collections and the
  /// variants of data types.
  bool _reaches(Object? ref, Set<String> kinds, [Set<String>? seen]) {
    if (ref is! Map) return false;
    final k = ref['k'];
    if (kinds.contains(k)) return true;
    switch (k) {
      case 'list' || 'set' || 'iterable' || 'stream':
        return _reaches(ref['of'], kinds, seen);
      case 'map':
        return _reaches(ref['of'], kinds, seen);
      case 'data':
        final id = ref['id']! as String;
        seen ??= {};
        if (!seen.add(id)) return false;
        // Implemented in JS: an object of functions.
        if (kinds.contains('fn') && c.types[id]?['implement'] != null) return true;
        final variants = c.types[id]?['variants'];
        if (variants is! List) return false;
        for (final v in variants) {
          for (final p in ((v as Json)['params']! as List).cast<Json>()) {
            if (_reaches(p['type'], kinds, seen)) return true;
          }
        }
    }
    return false;
  }

  /// Turns every unusable parameter of [params] into a skip. Returns false
  /// when the signature can no longer be called (a required parameter went).
  static bool _fix(List<Object?> params, String? Function(Json p) why) {
    var cut = false;
    for (var i = 0; i < params.length; i++) {
      final p = params[i]! as Json;
      final optionalPositional = p['named'] == false && p['required'] == false;
      if (!p.containsKey('type')) {
        if (optionalPositional) cut = true;
        continue;
      }
      final reason = cut && optionalPositional ? 'follows a skipped positional parameter' : why(p);
      if (reason == null) continue;
      if (optionalPositional) cut = true;
      if (p['required'] == true && p['nullable'] != true) return false;
      params[i] = {
        ...p..remove('type')..remove('dart'),
        'skip': reason,
        if (p['required'] == true) 'passNull': true,
      };
    }
    return true;
  }

  /// Applies the bridge's current limits, then turns refs
  /// to data types whose input side failed after they were referenced
  /// (recursive types resolved late) into skips, until nothing changes.
  /// Afterwards every ref in the manifest points at something an emitter can
  /// build.
  void _prune() {
    bool bad(Object? ref) {
      if (ref is! Map) return false;
      switch (ref['k']) {
        case 'data':
          final d = c.types[ref['id']];
          return d == null || d['inputSkipped'] != null || d['variants'] == null;
        case 'list' || 'set' || 'iterable' || 'stream':
          return bad(ref['of']);
        case 'map':
          return bad(ref['key']) || bad(ref['of']);
        case 'fn':
          return bad(ref['ret']);
      }
      return false;
    }

    String? notBuildable(Json p) => bad(p['type']) ? 'type not constructible' : null;

    // A BuildContext is the widget adapter's own: a value or a handle is
    // decoded without one, so it can't take a BuildContext or a typed widget
    // slot (built where the slot is).
    String? noContext(Json p) {
      bool needs(Object? t) => t is Map && switch (t['k']) {
        'supplied' => t['of'] == 'context',
        'widget' => t['as'] != null,
        'list' || 'set' || 'iterable' || 'stream' || 'map' => needs(t['of']),
        _ => false,
      };
      return needs(p['type']) ? 'needs the BuildContext of a widget' : null;
    }

    // Limits first: they only ever remove things.
    for (final d in c.types.values) {
      final variants = d['variants'];
      if (variants is List) {
        variants.removeWhere((v) {
          final ok = _fix((v as Json)['params']! as List, noContext);
          if (!ok) ((d['rejected'] ??= <String, String>{}) as Map)[v['tag']] = 'a required parameter cannot cross the bridge yet';
          return !ok;
        });
      }
      final ctors = d['ctors'];
      if (ctors is List) {
        ctors.removeWhere((k) => !_fix((k as Json)['params']! as List, noContext));
      }
    }

    // Handle method and setter values go through a channel call, which
    // carries values and handles but registers no function and keeps no
    // node alive.
    for (final d in c.types.values) {
      if (d['kind'] != 'handle') continue;
      final methods = d['methods'];
      if (methods is List) {
        methods.removeWhere((mj) {
          final ok = _fix((mj as Json)['params']! as List, (p) => _reaches(p['type'], _notPlain) ? 'holds a function or widget' : null);
          if (!ok) ((d['memberSkips'] ??= <String, String>{}) as Map)['${mj['name']}()'] = 'a required parameter holds a function or widget';
          return !ok;
        });
      }
      final setters = d['setters'];
      if (setters is List) {
        setters.removeWhere((sj) {
          final bad = _reaches((sj as Json)['type'], _notPlain);
          if (bad) ((d['memberSkips'] ??= <String, String>{}) as Map)['${sj['name']}='] = 'holds a function or widget';
          return bad;
        });
      }
    }

    // Statics go through a channel call too; a fake's members read the fake's
    // own node, so they take functions like any callback.
    for (final st in _statics) {
      final methods = st['methods']! as List;
      methods.removeWhere((mj) {
        final ok = _fix((mj as Json)['params']! as List, (p) => _reaches(p['type'], _notPlain) ? 'holds a function or widget' : null);
        if (!ok) _skip('${st['id']}${st['owner'] == null ? '' : '.'}${mj['name']}', 'function: a required parameter holds a function or widget');
        return !ok;
      });
    }

    var changed = true;
    while (changed) {
      changed = false;
      for (final d in c.types.values) {
        final variants = d['variants'];
        if (variants is! List || d['inputSkipped'] != null) continue;
        final before = variants.length;
        variants.removeWhere((v) => !_fix((v as Json)['params']! as List, notBuildable));
        if (variants.length != before) changed = true;
        if (d['implement'] case final Map impl) {
          final members = (impl['members']! as List).cast<Json>();
          if (members.any((mb) => bad(mb['fn']))) {
            d.remove('implement');
            d['implementSkipped'] = 'a member\'s type is not constructible';
            changed = true;
          }
        }
        if (variants.isEmpty && (d['consts'] as List? ?? const []).isEmpty && d['shorthands'] == null && d['implement'] == null) {
          d['inputSkipped'] = 'no usable constructor after pruning';
          changed = true;
        }
      }
      for (final d in c.types.values) {
        final ctors = d['ctors'];
        if (ctors is! List) continue;
        final before = ctors.length;
        ctors.removeWhere((k) => !_fix((k as Json)['params']! as List, notBuildable));
        if (ctors.length != before) changed = true;
        final methods = d['methods'];
        if (methods is List) {
          final n = methods.length;
          methods.removeWhere((mj) => !_fix((mj as Json)['params']! as List, notBuildable));
          if (methods.length != n) changed = true;
        }
        final setters = d['setters'];
        if (setters is List) {
          final n = setters.length;
          setters.removeWhere((sj) => bad((sj as Json)['type']));
          if (setters.length != n) changed = true;
        }
      }
      for (final st in _statics) {
        final methods = st['methods']! as List;
        final n = methods.length;
        methods.removeWhere((mj) => !_fix((mj as Json)['params']! as List, notBuildable));
        if (methods.length != n) changed = true;
      }
      for (final f in _fakes) {
        final members = f['members']! as List;
        members.removeWhere((mb) {
          if (!bad((mb as Json)['fn'])) return false;
          ((f['skips'] ??= <String, String>{}) as Map)[mb['name']] = 'a type is not constructible';
          changed = true;
          return true;
        });
      }
      _widgets.removeWhere((wj) {
        if (_fix(wj['params']! as List, notBuildable)) return false;
        _skip(wj['id']! as String, 'a required parameter\'s type is not constructible');
        changed = true;
        return true;
      });
    }
    // A data type with only constants left still has an input side.
    _handleRoots.removeWhere((id) {
      if ((c.types[id]!['ctors']! as List).isNotEmpty) return false;
      _skip(id, 'no constructor left that can cross the bridge yet');
      return true;
    });
  }
}
