// Rough decode cost per rebuild (JIT, debug asserts on: an upper bound, not a benchmark).
// ignore_for_file: deprecated_member_use, avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fuse_gen_spike/generated/flutter.g.dart';
import 'package:solid_fuse/solid_fuse.dart';

void main() {
  testWidgets('decode cost', (tester) async {
    final registry = FuseNodeRegistry(callFunction: (id, name, [value]) {});
    final rich = registry.create(1, 'gen_Container', {
      'width': 120,
      'padding': 16,
      'margin': {r'$': 'only', 'left': 4, 'top': 2},
      'alignment': 'center',
      'decoration': {
        r'$': 'BoxDecoration',
        'color': '#336699',
        'borderRadius': 12,
        'border': {r'$': 'all', 'color': '#000000', 'width': 2},
        'gradient': {r'$': 'LinearGradient', 'colors': ['#ff0000', '#00ff00'], 'begin': 'topLeft', 'end': 'bottomRight'},
        'boxShadow': [
          {'color': 'Colors.black26', 'blurRadius': 8, 'offset': {'dx': 0, 'dy': 2}},
        ],
      },
    });
    final plain = registry.create(2, 'gen_Container', {'width': 120, 'height': 40});
    final tile = registry.create(3, 'gen_ListTile', {'dense': true, 'onTap': true});
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    final ctx = tester.element(find.byType(SizedBox));
    void bench(String label, Widget Function() f) {
      for (var i = 0; i < 2000; i++) {
        f();
      }
      const n = 20000;
      final sw = Stopwatch()..start();
      for (var i = 0; i < n; i++) {
        f();
      }
      print('$label: ${(sw.elapsedMicroseconds / n).toStringAsFixed(2)} us/build');
    }

    bench('Container, 2 props', () => FuseGenContainer(plain).build(ctx));
    bench('Container, rich decoration (5 nested data classes)', () => FuseGenContainer(rich).build(ctx));
    bench('ListTile, 38 params mostly absent', () => FuseGenListTile(tile).build(ctx));
    bench('hand-written equivalent: Container(width,height)', () => Container(width: 120, height: 40));
  });
}
