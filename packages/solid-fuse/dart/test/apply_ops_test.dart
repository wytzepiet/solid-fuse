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
Map<String, dynamic> insert(int parent, int child, int index) => {
  'op': 'insert',
  'parentId': parent,
  'childId': child,
  'index': index,
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
      for (var i = 0; i < n; i++) ...[create(10 + i, 'text'), insert(1, 10 + i, i)],
      insert(0, 1, 0),
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
      rt.applyOps([remove(1, 10), insert(1, 10, 3)]);
      expect(childIds(1), [11, 12, 13, 10]);
      expect(rt.registry.tryGet(10), same(moved));
      expect(moved.parent, same(node(1)));
    });

    test('insert of an attached node moves it without a remove', () {
      mountList(4);
      rt.applyOps([insert(1, 13, 0)]);
      expect(childIds(1), [13, 10, 11, 12]);
      rt.applyOps([insert(1, 13, 3)]);
      expect(childIds(1), [10, 11, 12, 13]);
    });

    test('a moved subtree keeps its descendants', () {
      rt.applyOps([
        create(1), create(2), create(3, 'text'),
        insert(2, 3, 0), insert(1, 2, 0), insert(0, 1, 0),
        create(4), insert(0, 4, 1),
      ]);
      rt.applyOps([remove(1, 2), insert(4, 2, 0)]);
      expect(childIds(1), isEmpty);
      expect(childIds(4), [2]);
      expect(rt.registry.tryGet(3), isNotNull);
      expect(node(2).parent, same(node(4)));
    });

    test('reverse written as remove + insert pairs keeps every node', () {
      mountList(5);
      rt.applyOps([
        for (var i = 0; i < 4; i++) ...[remove(1, 10 + i), insert(1, 10 + i, 4 - i)],
      ]);
      expect(childIds(1), [14, 13, 12, 11, 10]);
    });

    test('a node removed and not re-inserted is disposed with its subtree', () {
      mountList(3);
      rt.applyOps([remove(1, 10), insert(1, 10, 2), remove(1, 11)]);
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
      rt.applyOps([create(2), insert(0, 2, 1), insert(2, 10, 0), remove(1, 10)]);
      expect(childIds(2), [10]);
      expect(rt.registry.tryGet(10), isNotNull);
    });

    test('parents of moved nodes are notified once per batch', () {
      mountList(4);
      var notified = 0;
      node(1).addListener(() => notified++);
      rt.applyOps([remove(1, 10), insert(1, 10, 3), insert(1, 12, 0)]);
      expect(notified, 1);
    });
  });
}
