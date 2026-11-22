// The `core` suite (reports 11, 14, 15) and the plain-Flutter baseline.
//
//   core     mount_200/1000/5000, update_t1/t50/t1000/c1000, list_replace_500,
//            list_sort/shuffle/reverse/filter on 2,000 rows; every record carries
//            the frame phases; 4 list-order checks per pass.
//   native   the mount cards written as plain Flutter widgets (what Flutter
//            itself costs for this UI), same phases and tree counts.
import 'dart:convert';
import 'dart:io' show Platform;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_test/flutter_test.dart' show TestPlatformDispatcher;
import 'package:solid_fuse/solid_fuse.dart';

import 'harness.dart';

/// Splits a frame into its phases. After the first frame (which goes through
/// the framework so first-frame bookkeeping happens) this replaces
/// WidgetsBinding.drawFrame + RendererBinding.drawFrame with the same calls in
/// the same order, timed.
class BenchBinding extends WidgetsFlutterBinding {
  static int buildUs = 0, layoutUs = 0, bitsUs = 0, paintUs = 0, compositeUs = 0, semanticsUs = 0, finalizeUs = 0;
  static int beginAt = 0, drawAt = 0, endAt = 0, frames = 0;
  static bool _first = true;

  // The Linux embedder turns semantics on unconditionally (fl_engine.cc calls
  // UpdateSemanticsEnabled(TRUE)); Android and iOS only do so when an
  // accessibility service is running. BENCH_SEMANTICS=0 reports "off" to the
  // framework, so no semantics tree is built: what a phone normally does.
  static final bool noSemantics = Platform.environment['BENCH_SEMANTICS'] == '0';
  late final TestPlatformDispatcher _noSemanticsDispatcher =
      TestPlatformDispatcher(platformDispatcher: ui.PlatformDispatcher.instance)..semanticsEnabledTestValue = false;

  @override
  ui.PlatformDispatcher get platformDispatcher => noSemantics ? _noSemanticsDispatcher : super.platformDispatcher;

  @override
  void handleBeginFrame(Duration? rawTimeStamp) {
    beginAt = now();
    super.handleBeginFrame(rawTimeStamp);
  }

  @override
  void drawFrame() {
    if (_first) {
      _first = false;
      super.drawFrame();
      return;
    }
    frames++;
    final t0 = drawAt = now();
    final root = rootElement;
    if (root != null) buildOwner!.buildScope(root);
    final t1 = now();
    rootPipelineOwner.flushLayout();
    final t2 = now();
    rootPipelineOwner.flushCompositingBits();
    final t3 = now();
    rootPipelineOwner.flushPaint();
    final t4 = now();
    if (sendFramesToEngine) {
      for (final renderView in renderViews) {
        renderView.compositeFrame();
      }
    }
    final t5 = now();
    if (sendFramesToEngine) rootPipelineOwner.flushSemantics();
    final t6 = now();
    buildOwner!.finalizeTree();
    final t7 = endAt = now();
    buildUs = t1 - t0;
    layoutUs = t2 - t1;
    bitsUs = t3 - t2;
    paintUs = t4 - t3;
    compositeUs = t5 - t4;
    semanticsUs = t6 - t5;
    finalizeUs = t7 - t6;
  }
}

Map<String, dynamic> phases() => {
      'buildMs': ms(BenchBinding.buildUs),
      'layoutMs': ms(BenchBinding.layoutUs),
      'bitsMs': ms(BenchBinding.bitsUs),
      'paintMs': ms(BenchBinding.paintUs),
      'compositeMs': ms(BenchBinding.compositeUs),
      'semanticsMs': ms(BenchBinding.semanticsUs),
      'finalizeMs': ms(BenchBinding.finalizeUs),
      // begin-frame (transient callbacks, microtasks) until drawFrame starts
      'preDrawMs': ms(BenchBinding.drawAt - BenchBinding.beginAt),
      'restMs': ms(BenchBinding.compositeUs + BenchBinding.semanticsUs + BenchBinding.finalizeUs + BenchBinding.bitsUs),
    };

Map<String, int> treeCounts() {
  var elements = 0, renderObjects = 0, fuseNodes = 0, stateful = 0;
  void visit(Element e) {
    elements++;
    if (e is RenderObjectElement) renderObjects++;
    if (e is StatefulElement) stateful++;
    if (e.widget is FuseNodeWidget) fuseNodes++;
    e.visitChildren(visit);
  }

  WidgetsBinding.instance.rootElement?.visitChildren(visit);
  return {'elements': elements, 'renderObjects': renderObjects, 'fuseNodeWidgets': fuseNodes, 'statefulElements': stateful};
}

// ---- the same card in plain Flutter ---------------------------------------------

final nativeCards = ValueNotifier<int>(0);
const _colors = [0xFF3366FF, 0xFF2E9E5B, 0xFFE08A00, 0xFFD64545, 0xFF7A4FD6, 0xFF0AA5A5, 0xFFC2478F, 0xFF5B6B7A];

class NativeCard extends StatelessWidget {
  const NativeCard(this.i, {super.key});
  final int i;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xFFFFFFFF),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E2E2)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 12,
            children: [
              SizedBox(
                width: 40,
                height: 40,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: Color(_colors[i % 8]), shape: BoxShape.circle),
                  child: Align(
                    child: Text(String.fromCharCode(65 + i % 26),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 2,
                children: [
                  Text('Item title $i', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  Text('Subtitle for row $i, with some detail',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF666666))),
                ],
              ),
              Text('${i % 60}m', style: const TextStyle(fontSize: 12, color: Color(0xFF999999))),
            ],
          ),
        ),
      ),
    );
  }
}

class NativeScreen extends StatelessWidget {
  const NativeScreen(this.cards, {super.key});
  final int cards;
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [for (var i = 0; i < cards; i++) NativeCard(i)],
        ),
      ),
    );
  }
}

/// After sort/shuffle/reverse/filter: is the Dart node tree in the order JS thinks it is?
Future<void> checkListOrder(String suite, Map<String, dynamic> x) async {
  final want = ((await cmd('listNames'))['names'] as List).cast<String>();
  FuseNode? list;
  void visit(FuseNode n) {
    if (list != null) return;
    if (n.children.length == want.length && want.length > 1) {
      list = n;
      return;
    }
    n.children.forEach(visit);
    for (final v in n.props.values) {
      if (v is FuseNode) visit(v);
    }
  }

  visit(rt.registry.get(0));
  final got = list?.children.map((row) => row.children.first.children.first.props['text'] as String?).toList();
  var same = got != null && got.length == want.length;
  for (var i = 0; same && i < want.length; i++) {
    if (got![i] != want[i]) same = false;
  }
  emit(suite, 'list_order_check', {...x, 'rows': want.length, 'dartTreeMatchesJs': same});
}


Future<void> core() async {
  const s = 'core';
  final reps = envInt('REPS', 5);
  Future<void> pass(Map<String, dynamic> x) async {
    for (final n in [200, 1000, 5000]) {
      await cmd('clear');
      await settle();
      final before = treeCounts();
      await measure(s, 'mount_$n', 'mount', {'nodes': n}, x);
      await settle();
      if (x['detail'] == true) {
        final after = treeCounts();
        emit(s, 'tree_counts', {'what': 'mount_$n', for (final k in after.keys) k: after[k]! - before[k]!});
      }
    }
    await cmd('clear');
    await settle();
    await cmd('updPrep');
    await settle(200);
    for (final sig in ['t1', 't50', 't1000', 'c1000']) {
      for (var i = 0; i < 2; i++) {
        await measure(s, 'update_$sig', 'upd', {'sig': sig}, x);
        await settle(30);
      }
    }
    await cmd('clear');
    await settle();
    await cmd('listPrep', {'n': 500});
    await settle(200);
    for (var i = 0; i < 2; i++) {
      await measure(s, 'list_replace_500', 'listReplace', {'n': 500}, x);
      await settle();
    }
    await checkListOrder(s, {...x, 'after': 'replace'});
    await cmd('clear');
    await settle();
    await cmd('listPrep', {'n': 2000});
    await settle(300);
    await measure(s, 'list_sort_2000', 'listSort', {}, x);
    await settle();
    await checkListOrder(s, {...x, 'after': 'sort'});
    await measure(s, 'list_shuffle_2000', 'listShuffle', {}, x);
    await settle();
    await checkListOrder(s, {...x, 'after': 'shuffle'});
    await measure(s, 'list_reverse_2000', 'listReverse', {}, x);
    await settle();
    await checkListOrder(s, {...x, 'after': 'reverse'});
    await measure(s, 'list_filter_2000_to_1000', 'listFilter', {}, x);
    await settle();
    await checkListOrder(s, {...x, 'after': 'filter'});
    await cmd('clear');
    await settle();
  }

  for (var r = 0; r < reps; r++) {
    await pass({'rep': r});
  }
  // Op counts, kinds and the stringify time come from a separate pass (they cost JS time).
  if (env['DETAIL'] == '0') return;
  await cmd('detail', {'on': true});
  await pass({'detail': true});
  await cmd('detail', {'on': false});
}


Future<void> native() async {
  const s = 'native';
  final reps = envInt('REPS', 5);
  for (var r = 0; r < reps; r++) {
    for (final cards in [18, 91, 454]) {
      final before = treeCounts();
      final t0 = now();
      nativeCards.value = cards;
      await SchedulerBinding.instance.endOfFrame;
      final t1 = now();
      final after = treeCounts();
      emit(s, 'native_cards_$cards', {
        'rep': r,
        'totalMs': ms(t1 - t0),
        'uiFrameMs': ms(BenchBinding.endAt - BenchBinding.beginAt),
        ...phases(),
        for (final k in after.keys) k: after[k]! - before[k]!,
      });
      await settle();
      nativeCards.value = 0;
      await settle(100);
    }
  }
}

/// JS-only mount ablations and micro benchmarks run inside the app's engine
/// (src/micro.tsx); nothing reaches Flutter except the result. Lines have the
/// shape tools/abl-agg.py reads (the same as the Rust harness prints).
Future<void> micro() async {
  final list = await cmd('ablList');
  Future<void> run(Map<String, dynamic> input) async {
    final out = await ch.call('bench', input, timeout: null);
    // ignore: avoid_print
    print('HARNESS ${jsonEncode({'in': input, 'out': out, 'heap0': 0, 'heap1': 0, 'obj0': 0, 'obj1': 0, 'load': loadavg()})}');
    await settle(20);
  }

  for (var i = 0; i < 3; i++) {
    await run({'cmd': 'mount', 'nodes': 1000});
    await run({'cmd': 'clear'});
  }
  for (final v in (list['variants'] as List).cast<String>()) {
    await run({'cmd': 'abl', 'v': v, 'cards': 91, 'reps': 11});
  }
  for (final m in (list['micro'] as List).cast<String>()) {
    await run({'cmd': 'micro', 'm': m, 'n': 5000, 'reps': 9});
  }
  for (var i = 0; i < 7; i++) {
    await run({'cmd': 'mount', 'nodes': 1000});
    await run({'cmd': 'clear'});
  }
}
