// Test double for the JS side of the bridge: a real FuseNodeRegistry whose
// callFunction records what Dart would send to JS (after a JSON round trip,
// like the wire).
// ignore_for_file: deprecated_member_use
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:fuse_objects_spike/fuse_obj_support.dart';
import 'package:solid_fuse/solid_fuse.dart';

class Bridge {
  final calls = <(int, String, dynamic)>[];
  late final registry = FuseNodeRegistry(
    callFunction: (id, name, [value]) => calls.add((id, name, jsonDecode(jsonEncode(value)))),
  );
  var _id = 1;

  /// What `createObject(type, props)` produces: a create op with the plain
  /// props, then `$state` / `$event` function markers.
  FuseNode node(String type, [Map<String, dynamic> props = const {}]) {
    final json = Map<String, dynamic>.from(jsonDecode(jsonEncode(props)) as Map);
    return registry.create(_id++, type, {...json, r'$state': true, r'$event': true});
  }

  /// Every `$state` patch pushed for [node], in order.
  List<Map<String, dynamic>> states(FuseNode node) => [
        for (final c in calls)
          if (c.$1 == node.id && c.$2 == r'$state') Map<String, dynamic>.from(c.$3 as Map),
      ];

  /// The mirrored state JS would hold: patches folded in order.
  Map<String, dynamic> mirrored(FuseNode node) => {for (final s in states(node)) ...s};

  List<Map<String, dynamic>> events(FuseNode node) => [
        for (final c in calls)
          if (c.$1 == node.id && c.$2 == r'$event') Map<String, dynamic>.from(c.$3 as Map),
      ];

  /// `handle.call(...)` with JSON round trips on both legs, like `_handleCall`.
  Future<dynamic> call(FuseNode node, String method, [Map<String, dynamic>? args]) async {
    final r = await node.ownHandle!.call(method, args == null ? null : jsonDecode(jsonEncode(args)));
    return jsonDecode(jsonEncode(r));
  }

  /// The `dispose` op.
  void dispose(FuseNode node) => registry.remove(node.id);
}

bool isErr(dynamic r, String type) => r is Map && r[kErr] is Map && (r[kErr] as Map)['type'] == type;

Widget host(Widget child) => MaterialApp(home: Scaffold(body: child));
