// Builds the manifest: the one JSON file the emitters (in the fuse CLI) turn
// into TypeScript and Dart adapters. Nothing here ever throws for a single
// item: an item that cannot be bridged lands in `skipped` with a reason.
import 'dart:convert';

import 'package:analyzer/dart/constant/value.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:crypto/crypto.dart';

import 'classify.dart';
import 'config.dart';
import 'dart_code.dart';
import 'docs.dart';
import 'world.dart';

/// Bumped whenever the manifest shape changes.
const manifestFormat = 1;

/// Bumped whenever the generator's output for the same input can change.
/// Part of the input hash.
const generatorVersion = '0.1.0';

class ManifestBuilder {
  ManifestBuilder(this.w, this.config, {int maxConsts = 400})
      : code = DartCode(w) {
    c = Classifier(w, code, maxConsts: maxConsts);
  }

  final World w;
  final GenConfig config;
  final DartCode code;
  late final Classifier c;

  final List<Json> _widgets = [];
  final List<Json> _skipped = [];
  final Set<String> _handleRoots = {};

  void _skip(String item, String reason) => _skipped.add({'item': item, 'reason': reason});

  Json build() {
    w.loadErrors.forEach((uri, why) {
      if (config.libraries.containsKey(uri)) _skip(uri, 'library did not load: $why');
    });
    // Shorthands first: data types pick them up as they are classified.
    config.libraries.forEach((uri, rule) {
      final lib = w.library(uri);
      if (lib != null && rule.annotated) _shorthands(lib);
    });
    config.libraries.forEach((uri, rule) {
      final lib = w.library(uri);
      if (lib == null) return;
      if (rule.annotated) {
        // The `@fuse` classes, by name; none means nothing (an empty allow
        // list would mean everything).
        final names = <String>[];
        lib.element.exportNamespace.definedNames2.forEach((name, el) {
          if (el is ClassElement && el.isPublic && _ownedBy(el, lib) && _annotation(el, 'Fuse') != null) names.add(name);
        });
        if (names.isEmpty) return;
        rule = LibraryRule(allow: names);
      }
      _library(lib, rule);
    });
    _prune();
    final types = Map.fromEntries(c.types.entries.toList()..sort((a, b) => a.key.compareTo(b.key)));
    final body = <String, Object?>{
      'widgets': _widgets,
      'handles': _handleRoots.toList()..sort(),
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

  // ── annotations ───────────────────────────────────────────────────────────

  static const _annotationsLib = 'package:solid_fuse/src/annotations.dart';

  /// The value of [e]'s annotation of class [cls] from solid_fuse.
  static DartObject? _annotation(Element e, String cls) {
    for (final a in e.metadata.annotations) {
      final v = a.computeConstantValue();
      final t = v?.type;
      if (t is InterfaceType && t.element.name == cls && t.element.library.uri.toString() == _annotationsLib) return v;
    }
    return null;
  }

  void _shorthands(EntryLib lib) {
    lib.element.exportNamespace.definedNames2.forEach((name, el) {
      if (el is! TopLevelFunctionElement || !_ownedBy(el, lib)) return;
      final a = _annotation(el, 'FuseShorthand');
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
      if (el is ClassElement && el.isPublic && _ownedBy(el, lib)) classes.add(el);
    });
    classes.sort((a, b) => a.name!.compareTo(b.name!));
    // A class name wins over a named constructor that would spell the same
    // component (PositionedDirectional vs Positioned.directional).
    final components = <String, String>{
      for (final cls in classes)
        if (!cls.isAbstract && w.isSubtypeOfEl(cls.thisType, w.widgetEl)) cls.name!: '',
    };
    for (final cls in classes) {
      final name = cls.name!;
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
      // notifiers, focus nodes) when the allow list is empty; any handle
      // class the allow list names. Handles that widget parameters reach are
      // in the manifest either way.
      final named = rule.explicitlyAllows(name) && rule.includes(name);
      final listenable = rule.allowsAll && rule.includes(name) && w.isSubtypeOfEl(cls.thisType, w.listenableEl);
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
    // Text children: the first required positional String, when there is no
    // child slot (Text("hi") -> <Text>hi</Text>).
    final text = children != null
        ? null
        : find((p) => p['named'] == false && p['required'] == true && (p['type']! as Map)['k'] == 'String' && (p['type']! as Map)['null'] != true);

    final id = '${lib.uri}#$name${cname == null ? '' : '.$cname'}';
    return {
      'id': id,
      'component': '$name${_cap(cname ?? '')}',
      'class': name,
      'ctor': ?cname,
      'dart': code.ref(cls),
      if (w.isSubtypeOfEl(cls.thisType, w.preferredSizeWidgetEl)) 'preferredSize': true,
      if (sig['deprecated'] == true) 'deprecated': true,
      if (firstParagraph(ctor.documentationComment) ?? firstParagraph(cls.documentationComment) case final d?) 'doc': d,
      if (cls.typeParameters.isNotEmpty)
        'typeParams': [
          for (final tp in cls.typeParameters)
            {'name': tp.name, if (tp.bound != null) 'bound': code.type(tp.bound!)},
        ],
      'params': params,
      'children': ?children,
      if (text != null) 'textChild': text['name'],
    };
  }

  // ── consistency ───────────────────────────────────────────────────────────

  /// Why the bridge cannot carry [ref] yet, or null. Nodes, functions and
  /// handles go anywhere (top-level props and inside values); a callback
  /// argument that is a handle waits for borrowed handles.
  String? _unsupported(Object? ref) {
    if (ref is! Map) return null;
    switch (ref['k']) {
      case 'fn':
        for (final a in (ref['args']! as List).cast<Json>()) {
          if (_carriesHandle(a['type'])) return 'callback argument is a handle (borrowed handles not bridged yet)';
        }
        return _unsupported(ref['ret']);
      case 'list' || 'set' || 'iterable':
        return _unsupported(ref['of']);
      case 'map':
        return _unsupported(ref['of']);
    }
    return null;
  }

  static bool _carriesHandle(Object? ref) {
    if (ref is! Map) return false;
    return switch (ref['k']) {
      'handle' => true,
      'list' || 'set' || 'iterable' => _carriesHandle(ref['of']),
      'map' => _carriesHandle(ref['of']),
      _ => false,
    };
  }

  static const _notPlain = {'fn', 'widget', 'handle', 'vsync'};

  /// Whether [ref] can hold one of [kinds], through collections and the
  /// variants of data types.
  bool _reaches(Object? ref, Set<String> kinds, [Set<String>? seen]) {
    if (ref is! Map) return false;
    final k = ref['k'];
    if (kinds.contains(k)) return true;
    switch (k) {
      case 'list' || 'set' || 'iterable':
        return _reaches(ref['of'], kinds, seen);
      case 'map':
        return _reaches(ref['of'], kinds, seen);
      case 'data':
        final id = ref['id']! as String;
        seen ??= {};
        if (!seen.add(id)) return false;
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

  /// Applies the bridge's current limits ([_unsupported]), then turns refs
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
        case 'list' || 'set' || 'iterable':
          return bad(ref['of']);
        case 'map':
          return bad(ref['key']) || bad(ref['of']);
        case 'fn':
          return bad(ref['ret']);
      }
      return false;
    }

    String? notBuildable(Json p) => bad(p['type']) ? 'type not constructible' : null;

    // Limits first: they only ever remove things.
    _widgets.removeWhere((wj) {
      final ok = _fix(wj['params']! as List, (p) => _unsupported(p['type']));
      if (!ok) _skip(wj['id']! as String, 'a required parameter cannot cross the bridge yet');
      return !ok;
    });
    for (final d in c.types.values) {
      final variants = d['variants'];
      if (variants is List) {
        variants.removeWhere((v) {
          final ok = _fix((v as Json)['params']! as List, (p) => _unsupported(p['type']));
          if (!ok) ((d['rejected'] ??= <String, String>{}) as Map)[v['tag']] = 'a required parameter cannot cross the bridge yet';
          return !ok;
        });
      }
      final ctors = d['ctors'];
      if (ctors is List) {
        ctors.removeWhere((k) => !_fix((k as Json)['params']! as List, (p) => _unsupported(p['type'])));
      }
    }

    // Handles: constructor options ride in the `create` op, which cannot
    // carry node references; method and setter values go through a channel
    // call, which carries plain values only.
    for (final d in c.types.values) {
      if (d['kind'] != 'handle') continue;
      final ctors = d['ctors'];
      if (ctors is List) {
        ctors.removeWhere((k) => !_fix((k as Json)['params']! as List, (p) => _reaches(p['type'], const {'widget', 'handle'}) ? 'holds a widget or handle' : null));
      }
      final methods = d['methods'];
      if (methods is List) {
        methods.removeWhere((mj) {
          final ok = _fix((mj as Json)['params']! as List, (p) => _reaches(p['type'], _notPlain) ? 'holds a function, widget or handle' : null);
          if (!ok) ((d['memberSkips'] ??= <String, String>{}) as Map)['${mj['name']}()'] = 'a required parameter holds a function, widget or handle';
          return !ok;
        });
      }
      final setters = d['setters'];
      if (setters is List) {
        setters.removeWhere((sj) {
          final bad = _reaches((sj as Json)['type'], _notPlain);
          if (bad) ((d['memberSkips'] ??= <String, String>{}) as Map)['${sj['name']}='] = 'holds a function, widget or handle';
          return bad;
        });
      }
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
        if (variants.isEmpty && (d['consts'] as List? ?? const []).isEmpty && d['shorthands'] == null) {
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
