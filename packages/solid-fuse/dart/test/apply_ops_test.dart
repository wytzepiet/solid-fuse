// FuseRuntime.applyOps: the Dart end of the op journal written by
// src/renderer.ts.
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/solid_fuse.dart';

Map<String, dynamic> create(int id, [String type = 'view']) => {
  'op': 'create',
  'id': id,
  'type': type,
  'props': <String, dynamic>{},
};
/// Insert [child] in front of sibling [before]; without it, append.
Map<String, dynamic> insert(int parent, int child, [int? before]) => {
  'op': 'insert',
  'parentId': parent,
  'childId': child,
  'before': ?before,
};
Map<String, dynamic> remove(int parent, int child) => {
  'op': 'remove',
  'parentId': parent,
  'childId': child,
};

void main() {
  late FuseRuntime rt;
  FuseNode node(int id) => rt.registry.get(id);
  List<int> childIds(int id) => node(id).children.map((c) => c.id).toList();

  /// A list node (id 1) under the root with children 10, 11, ... 10+n-1.
  void mountList(int n) {
    rt.applyOps([
      create(1),
      for (var i = 0; i < n; i++) ...[create(10 + i, 'text'), insert(1, 10 + i)],
      insert(0, 1),
    ]);
  }

  setUp(() => rt = FuseRuntime.forTest());

  test('create + insert build the tree', () {
    mountList(3);
    expect(childIds(0), [1]);
    expect(childIds(1), [10, 11, 12]);
    expect(node(11).parent, same(node(1)));
  });

  test('remove disposes the subtree', () {
    mountList(3);
    rt.applyOps([remove(0, 1)]);
    expect(childIds(0), isEmpty);
    expect(rt.registry.tryGet(1), isNull);
    expect(rt.registry.tryGet(11), isNull);
  });

  group('keyed moves', () {
    test('remove then insert of the same node in one batch moves it', () {
      mountList(4);
      final moved = node(10);
      rt.applyOps([remove(1, 10), insert(1, 10)]);
      expect(childIds(1), [11, 12, 13, 10]);
      expect(rt.registry.tryGet(10), same(moved));
      expect(moved.parent, same(node(1)));
    });

    test('insert of an attached node moves it without a remove', () {
      mountList(4);
      rt.applyOps([insert(1, 13, 10)]);
      expect(childIds(1), [13, 10, 11, 12]);
      rt.applyOps([insert(1, 13)]);
      expect(childIds(1), [10, 11, 12, 13]);
      rt.applyOps([insert(1, 10, 12)]);
      expect(childIds(1), [11, 10, 12, 13]);
      // Before itself, or before its own next sibling: stays where it is.
      rt.applyOps([insert(1, 10, 10), insert(1, 10, 12)]);
      expect(childIds(1), [11, 10, 12, 13]);
    });

    test('a moved subtree keeps its descendants', () {
      rt.applyOps([
        create(1), create(2), create(3, 'text'),
        insert(2, 3), insert(1, 2), insert(0, 1),
        create(4), insert(0, 4),
      ]);
      rt.applyOps([remove(1, 2), insert(4, 2)]);
      expect(childIds(1), isEmpty);
      expect(childIds(4), [2]);
      expect(rt.registry.tryGet(3), isNotNull);
      expect(node(2).parent, same(node(4)));
    });

    test('reverse written as remove + insert pairs keeps every node', () {
      mountList(5);
      rt.applyOps([
        // 10 goes last, then each next one in front of the previous.
        remove(1, 10), insert(1, 10),
        for (var i = 1; i < 4; i++) ...[remove(1, 10 + i), insert(1, 10 + i, 10 + i - 1)],
      ]);
      expect(childIds(1), [14, 13, 12, 11, 10]);
    });

    test('a node removed and not re-inserted is disposed with its subtree', () {
      mountList(3);
      rt.applyOps([remove(1, 10), insert(1, 10), remove(1, 11)]);
      expect(childIds(1), [12, 10]);
      expect(rt.registry.tryGet(11), isNull);
      expect(rt.registry.tryGet(10), isNotNull);
    });

    test('removing a parent and its child in one batch disposes each once', () {
      mountList(2);
      rt.applyOps([remove(1, 10), remove(0, 1)]);
      expect(rt.registry.tryGet(1), isNull);
      expect(rt.registry.tryGet(10), isNull);
      expect(rt.registry.tryGet(11), isNull);
    });

    test('a stale remove does not detach a node from its new parent', () {
      mountList(2);
      rt.applyOps([create(2), insert(0, 2), insert(2, 10), remove(1, 10)]);
      expect(childIds(2), [10]);
      expect(rt.registry.tryGet(10), isNotNull);
    });

    test('an insert before a node that is not a sibling appends', () {
      mountList(2);
      rt.applyOps([create(2), insert(0, 2), create(3), insert(2, 3), insert(1, 3, 2), insert(1, 10, 99)]);
      expect(childIds(1), [11, 3, 10]);
      expect(childIds(2), isEmpty);
    });

    test('children is a snapshot that follows edits; siblings link up', () {
      mountList(3);
      final before = node(1).children;
      expect(node(1).children, same(before));
      rt.applyOps([insert(1, 12, 10), remove(1, 11)]);
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
      rt.applyOps([
        for (var i = 1; i < n; i++) insert(1, 10 + i, i == 1 ? 10 : 10 + i - 1),
      ]);
      expect(childIds(1), [for (var i = n - 1; i >= 0; i--) 10 + i]);
    });

    test('parents of moved nodes are notified once per batch', () {
      mountList(4);
      var notified = 0;
      node(1).addListener(() => notified++);
      rt.applyOps([remove(1, 10), insert(1, 10), insert(1, 12, 11)]);
      expect(notified, 1);
    });
  });
}
