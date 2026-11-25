// Barrels: what crosses to JS is what `lib/fuse.dart` exports, in the app and
// in any package that ships one. Dart resolves the exports (show, hide,
// nested barrels); this turns the result into a rule per library the
// generated code imports from.
import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/constant/value.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:path/path.dart' as p;

import 'config.dart';
import 'world.dart';

const _annotationsLib = 'package:solid_fuse/src/annotations.dart';

/// The value of [e]'s annotation of class [cls] from solid_fuse.
DartObject? fuseAnnotation(Element e, String cls) {
  for (final a in e.metadata.annotations) {
    final v = a.computeConstantValue();
    final t = v?.type;
    if (t is InterfaceType && t.element.name == cls && t.element.library.uri.toString() == _annotationsLib) return v;
  }
  return null;
}

/// The app's package name, from its pubspec.
String? appPackage(String root) {
  final pubspec = File(p.join(root, 'pubspec.yaml'));
  if (!pubspec.existsSync()) return null;
  return RegExp(r'^name:\s*(\S+)', multiLine: true).firstMatch(pubspec.readAsStringSync())?.group(1);
}

/// `package:<name>/fuse.dart` of the app and of every package it resolves
/// that has a `lib/fuse.dart`.
List<String> barrelLibraries(String root) {
  final out = <String>[];
  final app = appPackage(root);
  if (app != null && File(p.join(root, 'lib', 'fuse.dart')).existsSync()) out.add('package:$app/fuse.dart');
  final config = File(p.join(root, '.dart_tool', 'package_config.json'));
  if (!config.existsSync()) return out;
  final base = config.parent.uri;
  final json = jsonDecode(config.readAsStringSync());
  for (final pkg in (json is Map ? json['packages'] as List? : null) ?? const []) {
    if (pkg is! Map) continue;
    final name = pkg['name'];
    if (name is! String || name == app) continue;
    final lib = base.resolve('${pkg['rootUri']}/').resolve('${pkg['packageUri'] ?? 'lib/'}');
    if (File.fromUri(lib.resolve('fuse.dart')).existsSync()) out.add('package:$name/fuse.dart');
  }
  return out..sort();
}

class BarrelRules {
  BarrelRules(this.rules, this.load, this.values);

  /// The classes a barrel names in a `show` (`export ... show Color`).
  final List<ClassElement> values;

  /// Library uri -> what of it crosses.
  final Map<String, LibraryRule> rules;

  /// Libraries to load before the rules can be read (where an exported
  /// class's package offers it).
  final Set<String> load;
}

/// What [barrels] export, as rules on the libraries generated code imports
/// from: a class of the barrel's own package through the library that
/// declares it, any other through its package's public library (Flutter's
/// through [supportLibraries]).
BarrelRules readBarrels(World w, List<String> barrels) {
  final allow = <String, Set<String>>{};
  final shorthands = <String, Set<String>>{};
  final load = <String>{};
  final own = <String>{};
  final values = <ClassElement>{};
  for (final uri in barrels) {
    final barrel = w.library(uri);
    if (barrel == null) continue;
    final shown = {
      for (final f in barrel.element.fragments)
        for (final e in f.libraryExports)
          for (final c in e.combinators.whereType<ShowElementCombinator>()) ...c.shownNames,
    };
    final pkg = Uri.parse(uri).pathSegments.first;
    barrel.element.exportNamespace.definedNames2.forEach((name, el) {
      if (name.startsWith('_')) return;
      final declared = el.library?.uri;
      if (declared == null) return;
      if (el is TopLevelFunctionElement && fuseAnnotation(el, 'FuseShorthand') != null) {
        load.add('$declared');
        (shorthands['$declared'] ??= {}).add(name);
        return;
      }
      // A class, or a function JS calls (routed the way a class is).
      if (el is! ClassElement && el is! TopLevelFunctionElement) return;
      if (el is ClassElement && shown.contains(name)) values.add(el);
      final home = declared.scheme == 'package' ? declared.pathSegments.first : 'flutter';
      final List<String> candidates;
      if (home == pkg) {
        candidates = ['$declared'];
        own.add('$declared');
      } else if (home == 'flutter') {
        candidates = supportLibraries;
      } else {
        candidates = [...w.publicLibrariesOf(home)]..sort((a, b) => (a == 'package:$home/$home.dart' ? 0 : 1) - (b == 'package:$home/$home.dart' ? 0 : 1));
      }
      for (final c in candidates) {
        final lib = w.library(c);
        if (lib == null) {
          if (!w.loadErrors.containsKey(c)) load.add(c);
          continue;
        }
        if (lib.element.exportNamespace.get2(name) != el || w.platformOnly(lib.element).contains(el)) continue;
        (allow[c] ??= {}).add(name);
        return;
      }
    });
  }
  final rules = <String, LibraryRule>{};
  for (final MapEntry(key: uri, value: names) in allow.entries) {
    final lib = w.library(uri)!;
    // All of another package's library: the same as exporting it whole
    // (its Listenables become controllers). The app's own classes stay
    // named, so each one it exports crosses.
    final everything = !own.contains(uri) &&
        lib.element.exportNamespace.definedNames2.entries.every((e) =>
            (e.value is! ClassElement && e.value is! TopLevelFunctionElement) ||
            e.key.startsWith('_') ||
            !_sameHome(e.value, uri) ||
            names.contains(e.key));
    rules[uri] = LibraryRule(allow: everything ? null : (names.toList()..sort()));
  }
  shorthands.forEach((uri, names) {
    final r = LibraryRule(allow: const [], shorthands: names);
    rules[uri] = rules[uri]?.union(r) ?? r;
  });
  return BarrelRules(rules, load, values.toList()..sort((a, b) => a.name!.compareTo(b.name!)));
}

bool _sameHome(Element el, String entry) {
  final declared = el.library?.uri;
  final target = Uri.parse(entry);
  if (declared == null) return false;
  if (target.scheme == 'dart') return declared.scheme == 'dart';
  return declared.scheme == 'package' && declared.pathSegments.first == target.pathSegments.first;
}
