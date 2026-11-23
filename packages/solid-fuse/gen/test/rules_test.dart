// Rule tests over test/fixtures/app (one example of every rule) and
// package:flutter/widgets.dart. Needs `flutter` on PATH for the fixture's
// `flutter pub get`.
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:solid_fuse_gen/solid_fuse_gen.dart';
import 'package:test/test.dart';

final fixture = p.join('test', 'fixtures', 'app');
const fixtureLib = 'package:fixture_app/fixture.dart';
const widgetsLib = 'package:flutter/widgets.dart';

typedef Json = Map<String, Object?>;

late Json manifest;

Json widget(String component) =>
    (manifest['widgets']! as List).cast<Json>().firstWhere((w) => w['component'] == component);

Json param(Json w, String name) => (w['params']! as List).cast<Json>().firstWhere((p) => p['name'] == name);

Json type(String id) => (manifest['types']! as Map)[id]! as Json;

String? skipReason(String item) =>
    (manifest['skipped']! as List).cast<Json>().where((s) => s['item'] == item).firstOrNull?['reason'] as String?;

void main() {
  setUpAll(() async {
    if (!File(p.join(fixture, '.dart_tool', 'package_config.json')).existsSync()) {
      final r = await Process.run('flutter', ['pub', 'get'], workingDirectory: fixture);
      if (r.exitCode != 0) throw StateError('flutter pub get failed: ${r.stderr}');
    }
    manifest = await generate(
      root: fixture,
      config: GenConfig.fromJson({
        'libraries': {
          fixtureLib: {},
          widgetsLib: {
            'allow': ['Text', 'Padding', 'Image.*', 'ListView', 'ScrollController', 'AnimationController'],
          },
        },
      }),
      cacheDir: p.join(fixture, '.dart_tool', 'solid_fuse_gen', 'cache'),
    );
  });

  group('widgets', () {
    test('positional String with no child slot becomes text children', () {
      expect(widget('Text')['textChild'], 'data');
      expect(widget('Label')['textChild'], 'text');
    });

    test('child / children become JSX children', () {
      expect(widget('Padding')['children'], {'param': 'child', 'many': false});
      expect(widget('Many')['children'], {'param': 'children', 'many': true});
      expect(widget('FixtureBox')['children'], {'param': 'child', 'many': false});
    });

    test('named constructors are their own components', () {
      expect(widget('LabelBig')['ctor'], 'big');
      expect(widget('ImageNetwork')['class'], 'Image');
    });

    test('allow list limits what a library exports', () {
      final components = (manifest['widgets']! as List).cast<Json>().map((w) => w['component']).toSet();
      expect(components, contains('Padding'));
      expect(components, isNot(contains('Container')));
    });

    test('a required parameter no rule covers skips the widget, with a reason', () {
      expect(skipReason('$fixtureLib#NeedsSecret'), contains('no public constructor'));
    });

    test('an optional parameter no rule covers is kept as a skip', () {
      final w = widget('FixtureBox');
      expect(param(w, 'hidden')['skip'], contains('default'));
      // A private constant whose value is plain is reproduced by value.
      expect(param(w, 'size')['default'], '3.0');
      // Required but nullable: the adapter passes null.
      expect(param(w, 'weird'), containsPair('passNull', true));
    });

    test('a BuildContext is the one the adapter builds in, never a prop', () {
      expect(param(widget('NeedsContext'), 'ctx')['type'], {'k': 'supplied', 'of': 'context'});
    });

    test('a value generic over the widget\'s type parameter is read at the bound', () {
      final options = param(widget('Choice'), 'options')['type']! as Json;
      expect(options['of'], {'k': 'data', 'id': '$fixtureLib#Option<Object?>'});
    });

    test('defaults are reproduced as Dart source', () {
      final w = widget('FixtureBox');
      expect(param(w, 'mode')['default'], 'fixture.Mode.a');
      expect(param(w, 'mode')['defaultValue'], 'a');
      expect(param(w, 'tags')['default'], "const <String>['x']");
    });

    test('callbacks', () {
      final w = widget('FixtureBox');
      expect(param(w, 'onTap')['type'], containsPair('k', 'fn'));
      final move = param(w, 'onMove')['type']! as Json;
      expect(((move['args']! as List).single as Json)['type'], {'k': 'data', 'id': '$fixtureLib#Point'});
      expect(param(w, 'onRefresh')['type'], containsPair('async', true));
      // A callback that returns a value at once is a synchronous call: a
      // builder returns a widget, `measure` a number.
      final builder = param(w, 'builder')['type']! as Json;
      expect(builder, containsPair('sync', true));
      expect(builder['ret'], containsPair('k', 'widget'));
      expect(builder['context'], true);
      expect(param(w, 'measure')['type'], allOf(containsPair('sync', true), containsPair('ret', {'k': 'double'})));
    });
  });

  group('types', () {
    test('immutable classes are data with positional params kept positional', () {
      final pt = type('$fixtureLib#Point');
      expect(pt['kind'], 'data');
      final v = (pt['variants']! as List).single as Json;
      final params = (v['params']! as List).cast<Json>();
      expect(params.map((p) => (p['name'], p['named'])), [('x', false), ('y', false)]);
      expect(params[1]['default'], '0.0');
      expect((pt['fields']! as List).cast<Json>().map((f) => f['name']), ['x', 'y']);
    });

    test('namespace constants are offered for their type', () {
      final consts = (type('$fixtureLib#Point')['consts']! as List).cast<Json>();
      expect(consts.map((c) => c['name']), contains('Palette.origin'));
      expect(consts.firstWhere((c) => c['name'] == 'Palette.origin')['dart'], 'fixture.Palette.origin');
    });

    test('recursive data refers to itself', () {
      final ch = type('$fixtureLib#Chain');
      final next = ((ch['variants']! as List).single as Json)['params']! as List;
      expect((next.first as Json)['type'], {'k': 'data', 'id': '$fixtureLib#Chain', 'null': true});
    });

    test('abstract data becomes a union of its subclasses, tagged by class', () {
      final sh = type('$fixtureLib#Shape');
      final tags = (sh['variants']! as List).cast<Json>().map((v) => v['tag']).toSet();
      expect(tags, {'Circle', 'Square', 'Square.unit'});
      expect((sh['consts']! as List).cast<Json>().map((c) => c['name']), contains('Palette.dot'));
    });

    test('enums keep deprecated values, marked', () {
      expect(type('$fixtureLib#Mode')['values'], [
        'a',
        'b',
        {'name': 'c', 'deprecated': true},
      ]);
    });

    test('a created handle: mirrored getters, setters, methods, streams', () {
      final h = type('$fixtureLib#Counter');
      List<String> names(String k) => [for (final x in h[k] as List) (x as Map)['name'] as String];
      expect(names('state'), containsAll(['start', 'count', 'label', 'disposed']));
      expect(names('setters'), ['label']);
      expect(names('methods'), containsAll(['increment', 'add', 'tick']));
      expect(names('methods'), isNot(contains('dispose')));
      expect(names('methods'), isNot(contains('addListener')));
      expect(names('streams'), ['ticks']);
      expect(h['disposable'], true);
      final add = (h['methods'] as List).cast<Map>().firstWhere((x) => x['name'] == 'add');
      expect(add['async'], true);
      expect(add['ret'], {'k': 'int'});
    });

    test('a TickerProvider is supplied by the runtime', () {
      final ac = type('$widgetsLib#AnimationController');
      final ctor = (ac['ctors'] as List).cast<Map>().firstWhere((c) => c['name'] == null);
      final vsync = (ctor['params'] as List).cast<Map>().firstWhere((p) => p['name'] == 'vsync');
      expect(vsync['type'], {'k': 'supplied', 'of': 'vsync'});
      expect([for (final x in ac['methods'] as List) (x as Map)['name']], containsAll(['forward', 'reverse', 'animateTo']));
    });

    test('@fuse exports the app\'s own classes; @fuseShorthand adds short forms', () {
      const lib = 'package:fixture_app/src/annotated.dart';
      expect(widget('Badge')['id'], '$lib#Badge');
      expect((manifest['widgets'] as List).any((w) => (w as Map)['component'] == 'Unmarked'), isFalse);
      expect(manifest['handles'], contains('$lib#Tally'));
      final point = type('package:fixture_app/fixture.dart#Point');
      expect(point['shorthands'], [
        {'kind': 'number', 'fn': contains('pointSquare'), 'type': {'k': 'double'}, 'dart': 'double'},
      ]);
      final insets = type('$widgetsLib#EdgeInsetsGeometry');
      expect((insets['shorthands'] as List).single, containsPair('fn', contains('edgeInsetsAll')));
      final color = type('$widgetsLib#Color');
      expect((color['shorthands'] as List).single, containsPair('ts', '`#\${string}`'));
    });

    test('Listenables and mutable classes are handles', () {
      expect(type('$fixtureLib#Counter')['kind'], 'handle');
      expect(type('$fixtureLib#Mutable')['kind'], 'handle');
      expect(type('$widgetsLib#ScrollController')['kind'], 'handle');
      expect(manifest['handles'], containsAll(['$fixtureLib#Counter', '$widgetsLib#ScrollController']));
      // Reached from a widget, but not a Listenable and not named: not a root.
      expect(manifest['handles'], isNot(contains('$fixtureLib#Mutable')));
    });
  });

  test('imports list every prefix the Dart strings use', () {
    final prefixes = (manifest['imports']! as List).cast<Json>().map((i) => i['prefix']).toSet();
    expect(prefixes, containsAll(['fixture', 'widgets']));
  });

  test('input hash changes with the config, not otherwise', () {
    final a = inputHash(root: fixture, configJson: '{"libraries":{}}');
    expect(inputHash(root: fixture, configJson: '{"libraries":{}}'), a);
    expect(inputHash(root: fixture, configJson: '{"libraries":{"x":{}}}'), isNot(a));
  });

  group('config', () {
    test('empty allow is everything; deny wins; patterns', () {
      final all = LibraryRule();
      expect(all.includes('Text'), isTrue);
      final r = LibraryRule(allow: ['Image.*', 'Text'], deny: ['Image.memory']);
      expect(r.includes('Text'), isTrue);
      expect(r.includes('Image', 'network'), isTrue);
      expect(r.includes('Image', 'memory'), isFalse);
      expect(r.includes('Container'), isFalse);
      expect(LibraryRule(allow: ['Image']).includes('Image', 'network'), isTrue);
    });

    test('bad config is a FormatException', () {
      expect(() => GenConfig.fromJson({'libraries': {'x': {'allow': 'Text'}}}), throwsFormatException);
    });
  });
}
