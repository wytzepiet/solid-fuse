// Templates on the Dart side: `define`, `instantiate` and `props` ops, and a
// replay of real batches recorded from the JS renderer.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/solid_fuse.dart';

class _Probe extends FuseHandle<Map<String, dynamic>> {
  _Probe(super.node) : object = Map.of(node.props);

  /// The node's props when the factory ran.
  @override
  final Map<String, dynamic> object;
}

/// The tree under [node] the way cli/compile-plugin.test.ts snapshots its
/// model: text as a string (adjacent text joined), node props resolved.
Object? snapshot(FuseNode node) {
  if (node.type == '__text__') return node.props['text'];
  final props = <String, Object?>{};
  for (final key in node.props.keys.toList()..sort()) {
    if (key == '_id') continue; // the root's own bookkeeping
    final value = node.props[key];
    props[key] = value is FuseNode ? snapshot(value) : value;
  }
  final out = <Object?>[node.type, props];
  for (final child in node.children) {
    final snap = snapshot(child);
    if (snap is String && out.length > 2 && out.last is String) {
      out[out.length - 1] = '${out.last}$snap';
    } else {
      out.add(snap);
    }
  }
  return out;
}

void main() {
  late FuseRuntime rt;
  FuseNode node(int id) => rt.registry.get(id);
  setUp(() => rt = FuseRuntime.forTest());

  final shape = [
    'view',
    {'padding': 8, 'layout': {'gap': 2}},
    ['text', {'fontSize': 12}, 'Total'],
    ['text', 0],
  ];

  test('instantiate builds the shape with consecutive ids in document order', () {
    rt.applyOps([7, 0, shape, 8, 0, 10, null, 4, 0, 10, null]);
    expect(node(10).type, 'view');
    expect(node(10).props, {'padding': 8, 'layout': {'gap': 2}});
    expect(node(10).children.map((c) => c.id), [11, 13]);
    expect(node(11).props, {'fontSize': 12});
    expect(node(12).type, '__text__');
    expect(node(12).props['text'], 'Total');
    expect(node(12).parent, same(node(11)));
    expect(node(13).children, isEmpty);
    expect(rt.registry.tryGet(14), isNull);
    expect(node(0).children.single, same(node(10)));
  });

  test('instances do not share props; a props op sets several at once and notifies', () {
    rt.applyOps([7, 0, shape, 8, 0, 10, null, 8, 0, 20, 'Card']);
    var notified = 0;
    node(13).addListener(() => notified++);
    rt.applyOps([9, 13, {'color': 'red', 'onTap': true}, 2, 10, 'padding', 4]);
    expect(node(13).props, {'color': 'red', 'onTap': true});
    expect(notified, 1);
    expect(node(10).props['padding'], 4);
    expect(node(20).props['padding'], 8);
    expect(node(23).props, isEmpty);
    // Dev builds name the component an instance was created in.
    expect(node(20).component, 'Card');
    expect(node(22).component, isNull);
    expect(node(10).component, isNull);
  });

  test('an unknown template is an error', () {
    expect(() => rt.applyOps([8, 5, 10, null]), throwsStateError);
  });

  test('a handle factory runs after the batch, with every prop the batch set', () {
    rt.registerHandle('probe', _Probe.new);
    rt.applyOps([
      7, 0, ['view', 0, ['probe', {'a': 1}]],
      8, 0, 10, null,
      9, 11, {'b': 2},
      0, 20, 'probe', {'c': 3},
      2, 20, 'd', 4,
      // Created and disposed in one batch: no handle.
      0, 30, 'probe', <String, dynamic>{},
      6, 30,
    ]);
    expect(node(11).handle<Map<String, dynamic>>(), {'a': 1, 'b': 2});
    expect(node(20).handle<Map<String, dynamic>>(), {'c': 3, 'd': 4});
    expect(rt.registry.tryGet(30), isNull);
  });

  test('an empty text node is not one of the children until it has text', () {
    rt.applyOps([0, 1, 'view', <String, dynamic>{}, 1, 2, '', 1, 3, 'a', 4, 1, 2, null, 4, 1, 3, null]);
    expect(node(1).children.map((c) => c.id), [3]);
    expect(node(1).firstChild, same(node(2)));
    rt.applyOps([3, 2, 'b']);
    expect(node(1).children.map((c) => c.id), [2, 3]);
    rt.applyOps([3, 2, '']);
    expect(node(1).children.map((c) => c.id), [3]);
  });

  // Recorded by cli/compile-plugin.test.ts from JSX compiled with templates
  // and run against the real renderer; `snapshots` is the tree after each
  // batch as the same JSX gives it without templates.
  final runs = jsonDecode(File('test/fixtures/template_ops.json').readAsStringSync())
      as Map<String, dynamic>;
  group('recorded batches', () {
    for (final entry in runs.entries) {
      test(entry.key, () {
        final batches = entry.value['batches'] as List;
        final snapshots = entry.value['snapshots'] as List;
        for (var i = 0; i < batches.length; i++) {
          rt.applyOps(batches[i] as List);
          expect(snapshot(node(0)), snapshots[i], reason: 'after batch $i');
        }
      });
    }
  });
}
