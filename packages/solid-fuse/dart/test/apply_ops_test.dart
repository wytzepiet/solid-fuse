// FuseRuntime.applyOps: the Dart end of the op journal written by
// src/renderer.ts.
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/solid_fuse.dart';

// One op each, in the flat layout of renderer.ts: opcode, then operands.
List<Object?> create(int id, [String type = 'view', Map<String, dynamic>? props]) =>
    [0, id, type, props ?? <String, dynamic>{}];
List<Object?> text(int id, String value) => [1, id, value];
List<Object?> setProp(int id, String name, Object? value) => [2, id, name, value];
List<Object?> setText(int id, String value) => [3, id, value];

/// Insert [child] in front of sibling [before]; without it, append.
List<Object?> insert(int parent, int child, [int? before]) => [4, parent, child, before];
List<Object?> remove(int child) => [5, child];
List<Object?> dispose(int id) => [6, id];

void main() {
  late FuseRuntime rt;
  FuseNode node(int id) => rt.registry.get(id);
  List<int> childIds(int id) => node(id).children.map((c) => c.id).toList();

  void apply(List<List<Object?>> ops) => rt.applyOps([for (final op in ops) ...op]);

  /// A list node (id 1) under the root with children 10, 11, ... 10+n-1.
  void mountList(int n) {
    apply([
      create(1),
      for (var i = 0; i < n; i++) ...[create(10 + i, 'text'), insert(1, 10 + i)],
      insert(0, 1),
    ]);
  }

  setUp(() => rt = FuseRuntime.forTest());

  test('non-finite numbers arrive as strings and read back as doubles', () {
    apply([
      create(1, 'view', {
        'width': 'Infinity',
        'left': '-Infinity',
        'ratio': 'NaN',
        'height': 12,
        'label': 'Infinity',
        'constraints': {'maxWidth': 'Infinity'},
      }),
    ]);
    expect(node(1).double('width'), double.infinity);
    expect(node(1).double('left'), double.negativeInfinity);
    expect(node(1).double('ratio'), isNaN);
    expect(node(1).double('height'), 12.0);
    expect(node(1).double('missing'), isNull);
    expect(node(1).double('other'), isNull);
    // A string prop keeps its text; only the number accessor interprets it.
    expect(node(1).string('label'), 'Infinity');
    expect(node(1).map('constraints')!.double('maxWidth'), double.infinity);
  });

  test('create + insert build the tree', () {
    mountList(3);
    expect(childIds(0), [1]);
    expect(childIds(1), [10, 11, 12]);
    expect(node(11).parent, same(node(1)));
  });

  test('remove detaches and keeps the node; it can come back in a later batch', () {
    mountList(3);
    apply([remove(1)]);
    expect(childIds(0), isEmpty);
    expect(node(1).parent, isNull);
    expect(childIds(1), [10, 11, 12]);
    apply([setProp(1, 'width', 2), insert(0, 1)]);
    expect(childIds(0), [1]);
    expect(node(1).props['width'], 2);
  });

  test('dispose removes the subtree, detaching it if still attached', () {
    mountList(3);
    var rootNotified = 0;
    node(0).addListener(() => rootNotified++);
    apply([dispose(1)]);
    expect(childIds(0), isEmpty);
    expect(rootNotified, 1);
    expect(rt.registry.tryGet(1), isNull);
    expect(rt.registry.tryGet(11), isNull);
  });

  test('create carries props; text nodes; setProp and setText notify', () {
    apply([
      create(1, 'text', {'fontSize': 12, 'onTap': true, '_component': 'Profile'}),
      text(2, 'a'),
      insert(1, 2),
      insert(0, 1),
    ]);
    expect(node(1).props, {'fontSize': 12, 'onTap': true});
    expect(node(1).component, 'Profile');
    expect(node(2).type, '__text__');
    expect(node(2).props['text'], 'a');

    var parentNotified = 0, textNotified = 0;
    node(1).addListener(() => parentNotified++);
    node(2).addListener(() => textNotified++);
    apply([setText(2, 'b'), setProp(1, 'fontSize', 14)]);
    expect(node(2).props['text'], 'b');
    expect(node(1).props['fontSize'], 14);
    expect(textNotified, 1);
    expect(parentNotified, 1);
  });

  test('a batch decoded from JSON text applies the same way', () {
    rt.applyOps(jsonDecode('[0,1,"view",{"width":40,"flex":{"gap":2}},1,2,"a",4,1,2,null,4,0,1,null,2,1,"height",1.5,3,2,"b"]') as List);
    expect(node(1).props, {'width': 40, 'flex': {'gap': 2}, 'height': 1.5});
    expect(node(2).props['text'], 'b');
    expect(childIds(0), [1]);
    expect(childIds(1), [2]);
  });

  test('a node-reference prop resolves to the node; a replaced or orphaned one lives until disposed', () {
    apply([create(1), create(2, 'icon'), setProp(1, 'leading', {'_node': 2}), insert(0, 1)]);
    expect(node(1).props['leading'], same(node(2)));
    apply([create(3, 'icon'), setProp(1, 'leading', {'_node': 3})]);
    expect(node(1).props['leading'], same(node(3)));
    // JS may hand the old node to this prop again.
    apply([setProp(1, 'leading', {'_node': 2})]);
    expect(node(1).props['leading'], same(node(2)));
    // Disposing the owner leaves referenced nodes to their own dispose.
    apply([dispose(1)]);
    expect(rt.registry.tryGet(2), isNotNull);
    apply([dispose(2), dispose(3)]);
    expect(rt.registry.tryGet(2), isNull);
  });

  test('dispose removes a node that was never inserted; unknown ids are ignored', () {
    apply([create(1, 'focusNode')]);
    apply([dispose(1), dispose(99)]);
    expect(rt.registry.tryGet(1), isNull);
  });

  test('an unknown opcode is an error', () {
    expect(() => rt.applyOps([42, 1]), throwsStateError);
  });

  group('keyed moves', () {
    test('remove then insert of the same node in one batch moves it', () {
      mountList(4);
      final moved = node(10);
      apply([remove(10), insert(1, 10)]);
      expect(childIds(1), [11, 12, 13, 10]);
      expect(rt.registry.tryGet(10), same(moved));
      expect(moved.parent, same(node(1)));
    });

    test('insert of an attached node moves it without a remove', () {
      mountList(4);
      apply([insert(1, 13, 10)]);
      expect(childIds(1), [13, 10, 11, 12]);
      apply([insert(1, 13)]);
      expect(childIds(1), [10, 11, 12, 13]);
      apply([insert(1, 10, 12)]);
      expect(childIds(1), [11, 10, 12, 13]);
      // Before itself, or before its own next sibling: stays where it is.
      apply([insert(1, 10, 10), insert(1, 10, 12)]);
      expect(childIds(1), [11, 10, 12, 13]);
    });

    test('a moved subtree keeps its descendants', () {
      apply([
        create(1), create(2), create(3, 'text'),
        insert(2, 3), insert(1, 2), insert(0, 1),
        create(4), insert(0, 4),
      ]);
      apply([remove(2), insert(4, 2)]);
      expect(childIds(1), isEmpty);
      expect(childIds(4), [2]);
      expect(rt.registry.tryGet(3), isNotNull);
      expect(node(2).parent, same(node(4)));
    });

    test('reverse written as remove + insert pairs keeps every node', () {
      mountList(5);
      apply([
        // 10 goes last, then each next one in front of the previous.
        remove(10), insert(1, 10),
        for (var i = 1; i < 4; i++) ...[remove(10 + i), insert(1, 10 + i, 10 + i - 1)],
      ]);
      expect(childIds(1), [14, 13, 12, 11, 10]);
    });

    test('disposing a parent and then its child is harmless', () {
      mountList(2);
      apply([remove(10), remove(1)]);
      apply([dispose(1), dispose(10), dispose(11)]);
      expect(rt.registry.tryGet(1), isNull);
      expect(rt.registry.tryGet(10), isNull);
      expect(rt.registry.tryGet(11), isNull);
    });

    test('an insert before a node that is not a sibling appends', () {
      mountList(2);
      apply([create(2), insert(0, 2), create(3), insert(2, 3), insert(1, 3, 2), insert(1, 10, 99)]);
      expect(childIds(1), [11, 3, 10]);
      expect(childIds(2), isEmpty);
    });

    test('children is a snapshot that follows edits; siblings link up', () {
      mountList(3);
      final before = node(1).children;
      expect(node(1).children, same(before));
      apply([insert(1, 12, 10), remove(11)]);
      expect(before.map((c) => c.id), [10, 11, 12]);
      expect(childIds(1), [12, 10]);
      expect(node(1).firstChild, same(node(12)));
      expect(node(12).nextSibling, same(node(10)));
      expect(node(10).nextSibling, isNull);
      expect(() => node(1).children.add(node(10)), throwsUnsupportedError);
    });

    test('a reorder of a long list ends in the requested order', () {
      const n = 500;
      mountList(n);
      // Reverse: every node but the last moves in front of the current head.
      apply([
        for (var i = 1; i < n; i++) insert(1, 10 + i, i == 1 ? 10 : 10 + i - 1),
      ]);
      expect(childIds(1), [for (var i = n - 1; i >= 0; i--) 10 + i]);
    });

    test('parents of moved nodes are notified once per batch', () {
      mountList(4);
      var notified = 0;
      node(1).addListener(() => notified++);
      apply([remove(10), insert(1, 10), insert(1, 12, 11)]);
      expect(notified, 1);
    });
  });
}
