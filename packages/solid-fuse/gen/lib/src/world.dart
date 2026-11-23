// The resolved element model the classifier works on.
//
// Only the libraries the config names (plus the Flutter/SDK support libraries
// generated Dart imports from) are loaded. Every index is built on first use:
// a run that never meets an abstract data type never builds the subclass
// index.
import 'dart:io';

import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/analysis/session.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:analyzer/dart/element/type_provider.dart';
import 'package:analyzer/dart/element/type_system.dart';
// The public AnalysisContextCollection has no way to pass a persistent byte
// store; without one every run re-reads the SDK and Flutter from source.
// ignore: implementation_imports
import 'package:analyzer/src/dart/analysis/analysis_context_collection.dart';
// ignore: implementation_imports
import 'package:analyzer/src/dart/analysis/file_byte_store.dart';

/// A library generated Dart may import, with the prefix it imports it under.
class EntryLib {
  EntryLib(this.uri, this.prefix, this.element);
  final String uri;

  /// Empty for dart:core (never imported with a prefix).
  final String prefix;
  final LibraryElement element;
}

/// Libraries that are always loaded so that types reached from target
/// libraries (Color, Offset, Duration, ...) have an import. Checked after the
/// targets, in this order.
const supportLibraries = <String>[
  'package:flutter/widgets.dart',
  'package:flutter/painting.dart',
  'package:flutter/rendering.dart',
  'package:flutter/gestures.dart',
  'package:flutter/services.dart',
  'package:flutter/animation.dart',
  'package:flutter/foundation.dart',
  'package:flutter/physics.dart',
  'package:flutter/scheduler.dart',
  'package:flutter/semantics.dart',
  'dart:ui',
  'dart:core',
  'dart:async',
];

class World {
  World._(this.session, this.entries, this.loadErrors);

  final AnalysisSession session;
  final List<EntryLib> entries;

  /// uri -> why it could not be loaded. Such a library is skipped, not fatal.
  final Map<String, String> loadErrors;

  late final LibraryElement _anchor = _byUri('package:flutter/widgets.dart')?.element ?? entries.first.element;
  TypeSystem get ts => _anchor.typeSystem;
  TypeProvider get tp => _anchor.typeProvider;

  late final InterfaceElement? widgetEl = _cls('Widget');
  late final InterfaceElement? keyEl = _cls('Key');
  late final InterfaceElement? localKeyEl = _cls('LocalKey');
  late final InterfaceElement? listenableEl = _cls('Listenable');
  late final InterfaceElement? buildContextEl = _cls('BuildContext');
  late final InterfaceElement? stateEl = _cls('State');
  late final InterfaceElement? renderObjectEl = _cls('RenderObject');
  late final InterfaceElement? elementEl = _cls('Element');
  late final InterfaceElement? tickerProviderEl = _cls('TickerProvider');

  InterfaceElement? _cls(String n) {
    final el = _byUri('package:flutter/widgets.dart')?.element.exportNamespace.get2(n);
    return el is InterfaceElement ? el : null;
  }

  EntryLib? _byUri(String uri) {
    for (final e in entries) {
      if (e.uri == uri) return e;
    }
    return null;
  }

  EntryLib? library(String uri) => _byUri(uri);

  /// One analysis context per package root, kept for the life of the
  /// process (a resident `fuse dev` reuses it; files that changed are
  /// re-read through [changed]).
  static final Map<String, AnalysisContextCollectionImpl> _collections = {};

  /// The public libraries of [package] (the .dart files directly in its
  /// lib/), as package: URIs.
  List<String> publicLibrariesOf(String package) {
    final path = session.uriConverter.uriToPath(Uri.parse('package:$package/_.dart'));
    if (path == null) return const [];
    final dir = Directory(File(path).parent.path);
    if (!dir.existsSync()) return const [];
    return [
      for (final f in dir.listSync())
        if (f is File && f.path.endsWith('.dart')) 'package:$package/${f.uri.pathSegments.last}',
    ]..sort();
  }

  /// Tells the analyzer [paths] changed on disk. Call before the next [load].
  static Future<void> changed(String root, Iterable<String> paths) async {
    final rootPath = Directory(root).absolute.resolveSymbolicLinksSync();
    final ctx = _collections[rootPath]?.contextFor(rootPath);
    if (ctx == null) return;
    for (final f in paths) {
      ctx.changeFile(File(f).absolute.path);
    }
    await ctx.applyPendingFileChanges();
  }

  static Future<World> load({
    required String root,
    required List<String> targets,
    List<String> extra = const [],
    String? cacheDir,
    String? sdkPath,
  }) async {
    final rootPath = Directory(root).absolute.resolveSymbolicLinksSync();
    final collection = _collections[rootPath] ??= () {
      FileByteStore? store;
      if (cacheDir != null) {
        Directory(cacheDir).createSync(recursive: true);
        store = FileByteStore(cacheDir);
      }
      return AnalysisContextCollectionImpl(
        includedPaths: [rootPath],
        byteStore: store,
        sdkPath: sdkPath,
      );
    }();
    final session = collection.contextFor(rootPath).currentSession;
    final entries = <EntryLib>[];
    final errors = <String, String>{};
    final prefixes = <String>{};
    for (final uri in {...targets, ...extra, ...supportLibraries}) {
      try {
        final r = await session.getLibraryByUri(uri);
        if (r is! LibraryElementResult) {
          errors[uri] = r.runtimeType.toString();
          continue;
        }
        entries.add(EntryLib(uri, _prefixFor(uri, prefixes), r.element));
      } catch (e) {
        errors[uri] = '$e';
      }
    }
    if (entries.isEmpty) throw StateError('no library could be loaded: $errors');
    return World._(session, entries, errors);
  }

  /// `package:flutter/widgets.dart` -> `widgets`, `package:fl_chart/fl_chart.dart`
  /// -> `fl_chart`, `dart:ui` -> `ui`; a number is appended on a clash.
  static String _prefixFor(String uri, Set<String> taken) {
    // A prefixed dart:core import would hide the implicit one.
    if (uri == 'dart:core') return '';
    final u = Uri.parse(uri);
    var base = u.scheme == 'dart'
        ? u.path
        : u.pathSegments.last.replaceAll('.dart', '');
    base = base.replaceAll(RegExp(r'[^A-Za-z0-9_]'), '_');
    var p = base;
    for (var i = 2; !taken.add(p); i++) {
      p = '$base$i';
    }
    return p;
  }

  // ── imports ───────────────────────────────────────────────────────────────

  final Map<Element, EntryLib?> _importMemo = {};

  /// The first entry library that exports [e], or null when generated code
  /// cannot name it.
  EntryLib? importOf(Element e) => _importMemo.putIfAbsent(e, () {
        final name = e.name;
        if (name == null || name.startsWith('_')) return null;
        // Prefer a library of the package that declares [e] (Flutter's
        // Visibility through widgets.dart, not through cupertino_ui's
        // re-export); dart:ui and friends come through Flutter.
        final declared = e.library?.uri;
        final home = declared == null
            ? null
            : declared.scheme == 'package'
                ? declared.pathSegments.first
                : 'flutter';
        EntryLib? fallback;
        for (final lib in entries) {
          if (lib.element.exportNamespace.get2(name) != e) continue;
          final u = Uri.parse(lib.uri);
          final pkg = u.scheme == 'package' ? u.pathSegments.first : u.scheme;
          if (pkg == home || (u.scheme == 'dart' && declared?.scheme == 'dart')) return lib;
          fallback ??= lib;
        }
        if (fallback != null) return fallback;
        final uri = e.library?.uri;
        if (uri != null && uri.scheme == 'package') missedPackages.add(uri.pathSegments.first);
        return null;
      });

  /// Packages that declare a type no entry library exports (LatLng reached
  /// through flutter_map lives in latlong2). [load] with those packages'
  /// main libraries added makes them nameable.
  final Set<String> missedPackages = {};

  bool isExported(Element e) => importOf(e) != null;

  bool isSubtypeOfEl(DartType t, InterfaceElement? el) =>
      el != null && t is InterfaceType && t.asInstanceOf(el) != null;

  // ── lazy indexes ──────────────────────────────────────────────────────────

  late final List<InterfaceElement> publicClasses = () {
    final seen = <Element>{};
    final out = <InterfaceElement>[];
    for (final e in entries) {
      e.element.exportNamespace.definedNames2.forEach((name, el) {
        if (el is InterfaceElement && !name.startsWith('_') && seen.add(el)) out.add(el);
      });
    }
    return out;
  }();

  /// Direct subtypes (extends / implements / with), for transitive walks.
  late final Map<InterfaceElement, List<InterfaceElement>> _children = () {
    final m = <InterfaceElement, List<InterfaceElement>>{};
    for (final c in publicClasses) {
      final direct = <InterfaceType>[
        if (c.supertype != null) c.supertype!,
        ...c.interfaces,
        ...c.mixins,
      ];
      for (final s in direct) {
        (m[s.element] ??= []).add(c);
      }
    }
    return m;
  }();

  final Map<InterfaceElement, List<InterfaceElement>> _subMemo = {};

  /// All exported classes that are subtypes of [e] (not [e] itself). Private
  /// intermediate classes are not in the index, so a public class that
  /// reaches [e] only through a private one is missed; acceptable, since the
  /// union of variants is a convenience, not a guarantee.
  List<InterfaceElement> subclassesOf(InterfaceElement e) => _subMemo.putIfAbsent(e, () {
        final out = <InterfaceElement>[];
        final seen = <InterfaceElement>{e};
        final todo = [e];
        while (todo.isNotEmpty) {
          for (final c in _children[todo.removeLast()] ?? const <InterfaceElement>[]) {
            if (seen.add(c)) {
              out.add(c);
              todo.add(c);
            }
          }
        }
        return out;
      });

  /// Public exported classes that only hold static constants (Colors, Icons,
  /// Curves): no public constructor and no instance members.
  late final List<InterfaceElement> namespaces = [
    for (final c in publicClasses)
      if (c is ClassElement &&
          !c.metadata.hasDeprecated &&
          c.fields.any((f) => f.isStatic && f.isConst && f.isPublic) &&
          (c.constructors.every((k) => k.isPrivate) ||
              (c.isAbstract &&
                  !c.constructors.any((k) => k.isFactory && k.isPublic) &&
                  c.fields.every((f) => f.isStatic))))
        c,
  ];
}
