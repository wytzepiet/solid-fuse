// Loads resolved element models and builds the indexes the classifier needs:
//  * entry libraries (what generated code is allowed to import)
//  * element -> import (uri + prefix)
//  * subclass index (for abstract / extendable data types -> tagged unions)
//  * static-const index (for enum-likes: Colors.red, Curves.easeIn, ...)
import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/analysis/session.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:analyzer/dart/element/type_system.dart';

class EntryLib {
  EntryLib(this.uri, this.prefix, this.element);
  final String uri;

  /// Import prefix used by generated Dart code; null = unprefixed.
  final String? prefix;
  final LibraryElement element;
}

/// Flutter + SDK libraries generated code may import, in priority order.
/// The first entry that exports an element wins.
const _flutterEntries = <(String, String?)>[
  ('package:flutter/material.dart', null),
  ('package:flutter/cupertino.dart', 'cupertino'),
  ('package:flutter/widgets.dart', 'widgets'),
  ('package:flutter/gestures.dart', 'gestures'),
  ('package:flutter/services.dart', 'services'),
  ('package:flutter/rendering.dart', 'rendering'),
  ('package:flutter/painting.dart', 'painting'),
  ('package:flutter/foundation.dart', 'foundation'),
  ('package:flutter/animation.dart', 'animation'),
  ('package:flutter/physics.dart', 'physics'),
  ('package:flutter/scheduler.dart', 'scheduler'),
  ('package:flutter/semantics.dart', 'semantics'),
  ('dart:ui', 'ui'),
  ('dart:core', null),
  ('dart:async', 'async'),
  ('dart:typed_data', 'typed_data'),
  ('dart:math', 'math'),
  ('dart:io', 'io'), // objects spike: plugin APIs return File / Directory
];

class StaticConst {
  StaticConst(this.owner, this.field);
  final InterfaceElement owner;
  final FieldElement field;

  /// Owner has no usable public generative constructor, i.e. it is a pure
  /// namespace of constants (Colors, Icons, Curves, SystemMouseCursors, ...).
  late final bool ownerIsNamespace = owner is ClassElement &&
      owner.constructors.every((c) => c.isPrivate || (c.isFactory == false && (owner as ClassElement).isAbstract));
}

class World {
  World._(this.session, this.entries);

  final AnalysisSession session;
  final List<EntryLib> entries;

  late final LibraryElement material = entries.first.element;
  TypeSystem get ts => material.typeSystem;

  final Map<Element, EntryLib> _importOf = {};
  final List<InterfaceElement> publicClasses = [];
  final Map<InterfaceElement, List<InterfaceElement>> _subclasses = {};
  final List<StaticConst> staticConsts = [];

  late final InterfaceElement widgetEl = _cls('Widget');
  late final InterfaceElement preferredSizeWidgetEl = _cls('PreferredSizeWidget');
  late final InterfaceElement keyEl = _cls('Key');
  late final InterfaceElement listenableEl = _cls('Listenable');
  late final InterfaceElement buildContextEl = _cls('BuildContext');
  late final InterfaceElement stateEl = _cls('State');
  late final InterfaceElement renderObjectEl = _cls('RenderObject');
  late final InterfaceElement elementEl = _cls('Element');

  InterfaceElement _cls(String n) =>
      material.exportNamespace.get2(n) as InterfaceElement;

  static Future<World> load(String packageRoot,
      {List<(String, String)> extraLibs = const []}) async {
    final collection = AnalysisContextCollection(
        includedPaths: [Directory(packageRoot).absolute.resolveSymbolicLinksSync()]);
    final session = collection.contexts.first.currentSession;
    final entries = <EntryLib>[];
    Future<void> add(String uri, String? prefix) async {
      final r = await session.getLibraryByUri(uri);
      if (r is! LibraryElementResult) {
        throw StateError('cannot resolve $uri: $r');
      }
      entries.add(EntryLib(uri, prefix, r.element));
    }

    // material first (unprefixed), then extra package libs, then the rest of
    // Flutter and the SDK.
    await add(_flutterEntries.first.$1, _flutterEntries.first.$2);
    for (final (uri, prefix) in extraLibs) {
      await add(uri, prefix);
    }
    for (final (uri, prefix) in _flutterEntries.skip(1)) {
      await add(uri, prefix);
    }
    final w = World._(session, entries);
    w._index();
    return w;
  }

  void _index() {
    final seen = <Element>{};
    for (final e in entries) {
      e.element.exportNamespace.definedNames2.forEach((name, el) {
        if (name.startsWith('_')) return;
        _importOf.putIfAbsent(el, () => e);
        if (!seen.add(el)) return;
        if (el is InterfaceElement) {
          publicClasses.add(el);
          for (final f in el.fields) {
            if (f.isStatic && f.isConst && f.isPublic && !f.isEnumConstant &&
                !f.metadata.hasDeprecated) {
              staticConsts.add(StaticConst(el, f));
            }
          }
        }
      });
    }
    for (final c in publicClasses) {
      for (final s in c.allSupertypes) {
        (_subclasses[s.element] ??= []).add(c);
      }
    }
  }

  EntryLib? importOf(Element e) => _importOf[e];
  bool isExported(Element e) => _importOf.containsKey(e);

  List<InterfaceElement> subclassesOf(InterfaceElement e) =>
      _subclasses[e] ?? const [];

  bool isSubtypeOfEl(DartType t, InterfaceElement el) =>
      t is InterfaceType && t.asInstanceOf(el) != null;

  /// All public classes exported by [libUri] that are concrete Widgets.
  List<ClassElement> widgetsOf(String libUri) {
    final lib = entries.firstWhere((e) => e.uri == libUri).element;
    final out = <ClassElement>[];
    lib.exportNamespace.definedNames2.forEach((name, el) {
      if (el is ClassElement &&
          el.isPublic &&
          !el.isAbstract &&
          el.allSupertypes.any((s) => s.element == widgetEl)) {
        out.add(el);
      }
    });
    return out;
  }
}
