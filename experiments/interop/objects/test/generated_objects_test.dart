// Drives the GENERATED handles through their `call` dispatch (what
// `_handleCall` does) and asserts that the real Flutter controller changed
// and that state pushes reach "JS" (the recorded callFunction calls).
// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fuse_objects_spike/fuse_obj_support.dart';
import 'package:fuse_objects_spike/generated/controllers.g.dart';
import 'package:video_player_platform_interface/video_player_platform_interface.dart';

import 'bridge.dart';

Widget list(ScrollController c, {int items = 100}) => ListView.builder(
      controller: c,
      itemExtent: 50,
      itemCount: items,
      itemBuilder: (_, i) => Text('item $i'),
    );

void main() {
  setUpAll(registerControllersWrappers);

  group('ScrollController', () {
    testWidgets('constructor args, RPC, mirrored state, de-duplication', (tester) async {
      final b = Bridge();
      final node = b.node('gen_ScrollController', {'initialScrollOffset': 120, 'debugLabel': 'feed'});
      final h = node.ownHandle = GenScrollControllerHandle(node);
      final c = h.object;
      expect(c.initialScrollOffset, 120);
      expect(c.debugLabel, 'feed');
      expect(c.keepScrollOffset, true); // Flutter's default, regenerated

      // Not attached: `offset` is not readable; the initial snapshot has hasClients only.
      await tester.pump();
      expect(b.mirrored(node), {'hasClients': false});

      await tester.pumpWidget(host(list(c)));
      await tester.pump();
      expect(b.mirrored(node), {'hasClients': true, 'offset': 120});

      // jumpTo: positional parameter keyed by its declared name.
      expect(await b.call(node, 'jumpTo', {'value': 300}), null);
      expect(c.offset, 300);
      expect(b.states(node).last, {'offset': 300});

      // animateTo: Future-returning; the RPC resolves when the animation ends.
      var resolved = false;
      final f = b.call(node, 'animateTo', {'offset': 500, 'duration': 200, 'curve': 'Curves.easeInOut'}).then((r) {
        resolved = true;
        return r;
      });
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(resolved, false);
      expect(c.offset, greaterThan(300));
      expect(c.offset, lessThan(500));
      await tester.pumpAndSettle();
      expect(await f, null);
      expect(resolved, true);
      expect(c.offset, 500);
      expect(b.mirrored(node)['offset'], 500);

      // De-duplication: a notification that changes nothing mirrored sends nothing.
      final before = b.states(node).length;
      c.notifyListeners();
      c.position.notifyListeners();
      expect(b.states(node).length, before);

      // On-demand read.
      expect(await b.call(node, r'$get', {'name': 'keepScrollOffset'}), true);
      expect(await b.call(node, r'$get', {'name': 'offset'}), 500);
    });

    testWidgets('typed errors cross as an envelope, not a string', (tester) async {
      final b = Bridge();
      final node = b.node('gen_ScrollController');
      node.ownHandle = GenScrollControllerHandle(node);
      // Required argument missing.
      final r1 = await b.call(node, 'animateTo', {'offset': 10});
      expect(isErr(r1, 'ArgumentError'), true, reason: '$r1');
      expect((r1[kErr] as Map)['message'], contains('duration'));
      // Unknown member.
      final r2 = await b.call(node, 'attach', {});
      expect(isErr(r2, 'UnknownMember'), true);
      expect((r2[kErr] as Map)['code'], 'attach');
      // A Flutter assertion (no attached position) keeps its type.
      final r3 = await b.call(node, 'jumpTo', {'value': 10});
      expect(r3[kErr], isA<Map>());
      expect((r3[kErr] as Map)['type'], contains('AssertionError'));
      // Bad record value.
      final r4 = await b.call(node, 'animateTo', {'offset': 1, 'duration': 1, 'curve': 'Curves.nope'});
      expect(isErr(r4, 'ArgumentError'), true, reason: '$r4');
    });

    testWidgets('guard: one controller on two scroll views does not throw', (tester) async {
      final b = Bridge();
      final node = b.node('gen_ScrollController');
      final h = node.ownHandle = GenScrollControllerHandle(node);
      final c = h.object;
      await tester.pumpWidget(host(Column(children: [
        Expanded(child: list(c)),
        Expanded(child: list(c)),
      ])));
      await tester.pump();
      expect(c.positions.length, 2);
      expect(b.mirrored(node), {'hasClients': true}); // offset is guarded out
      c.positions.first.jumpTo(40);
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(b.mirrored(node).containsKey('offset'), false);
    });

    testWidgets('lifetime: dispose op disposes the controller; later calls fail cleanly', (tester) async {
      final b = Bridge();
      final node = b.node('gen_ScrollController');
      final h = node.ownHandle = GenScrollControllerHandle(node);
      final c = h.object;
      b.dispose(node);
      expect(() => c.addListener(() {}), throwsFlutterError); // really disposed
      expect(b.registry.tryGet(node.id), isNull); // the runtime answers HandleDisposedError here
      await tester.pump(); // the pending initial push must not fire after dispose
      expect(b.states(node), isEmpty);
    });

    testWidgets('an object returned by Dart: borrowed ScrollPosition as a new handle', (tester) async {
      final b = Bridge();
      final node = b.node('gen_ScrollController');
      final h = node.ownHandle = GenScrollControllerHandle(node);
      final c = h.object;
      await tester.pumpWidget(host(list(c)));

      final ref = await b.call(node, r'$get', {'name': 'position'}) as Map;
      expect(ref['type'], 'gen_ScrollPosition');
      expect(ref['_node'], lessThan(0)); // Dart-allocated id
      expect(ref['state'], {'pixels': 0, 'maxScrollExtent': 50.0 * 100 - 600});
      // Identity is preserved: asking again yields the same node.
      final again = await b.call(node, r'$get', {'name': 'position'}) as Map;
      expect(again['_node'], ref['_node']);

      final pos = b.registry.get(ref['_node'] as int);
      expect(pos.ownHandle!.object, same(c.position));
      // "JS" registers its handlers on the adopted node, then drives it.
      pos.setPropSilent(r'$state', true);
      expect(await b.call(pos, 'jumpTo', {'value': 250}), null);
      expect(c.offset, 250);
      expect(b.states(pos).last, {'pixels': 250});
      expect(await b.call(pos, r'$get', {'name': 'atEdge'}), false);
      expect(await b.call(pos, r'$get', {'name': 'axisDirection'}), 'down');

      // Disposing the adopted node from JS does not dispose a borrowed object.
      b.dispose(pos);
      expect(c.position.pixels, 250);
      c.position.jumpTo(10); // would throw if the position had been disposed
      // A fresh request adopts again; disposing the parent removes the child.
      final ref2 = await b.call(node, r'$get', {'name': 'position'}) as Map;
      expect(b.registry.tryGet(ref2['_node'] as int), isNotNull);
      await tester.pumpWidget(host(const SizedBox()));
      b.dispose(node);
      expect(b.registry.tryGet(ref2['_node'] as int), isNull);
    });
  });

  group('FocusNode', () {
    testWidgets('requestFocus / unfocus drive the real node; hasFocus is pushed', (tester) async {
      final b = Bridge();
      final node = b.node('gen_FocusNode', {'debugLabel': 'field', 'skipTraversal': true});
      final h = node.ownHandle = GenFocusNodeHandle(node);
      final f = h.object;
      expect(f.debugLabel, 'field');
      expect(f.skipTraversal, true);
      await tester.pumpWidget(host(TextField(focusNode: f)));
      await tester.pump();
      expect(b.mirrored(node), {'hasFocus': false, 'hasPrimaryFocus': false});

      expect(await b.call(node, 'requestFocus'), null);
      await tester.pump();
      expect(f.hasFocus, true);
      expect(b.mirrored(node), {'hasFocus': true, 'hasPrimaryFocus': true});

      expect(await b.call(node, 'unfocus', {'disposition': 'scope'}), null);
      await tester.pump();
      expect(f.hasFocus, false);
      expect(b.mirrored(node)['hasFocus'], false);

      // setter + value-returning method
      expect(await b.call(node, r'$set', {'name': 'canRequestFocus', 'value': false}), null);
      expect(f.canRequestFocus, false);
      expect(await b.call(node, 'nextFocus'), isA<bool>());
      // sync callback is not bridged
      expect(isErr(await b.call(node, r'$set', {'name': 'onKeyEvent', 'value': true}), 'UnknownMember'), true);
    });

    testWidgets('object argument: requestFocus(otherNode) resolves a handle reference', (tester) async {
      final b = Bridge();
      final scopeNode = b.node('gen_FocusNode');
      final otherNode = b.node('gen_FocusNode');
      final a = (scopeNode.ownHandle = GenFocusNodeHandle(scopeNode)).object;
      final o = (otherNode.ownHandle = GenFocusNodeHandle(otherNode)).object;
      await tester.pumpWidget(host(Column(children: [TextField(focusNode: a), TextField(focusNode: o)])));
      // FocusNode.requestFocus([FocusNode? node]) asserts node is a descendant; pass a bad
      // reference to prove resolution and the typed error path instead.
      final bad = await b.call(scopeNode, 'requestFocus', {'node': {'_node': 9999}});
      expect(isErr(bad, 'BadObjectRef'), true, reason: '$bad');
      final good = await b.call(scopeNode, 'requestFocus', {'node': {'_node': otherNode.id}});
      // Resolved to the real FocusNode: Flutter's own descendant assertion fires (typed).
      expect(good == null || (good[kErr] as Map)['type'].toString().contains('AssertionError'), true, reason: '$good');
      expect(o, isNotNull);
    });
  });

  group('TextEditingController (ValueNotifier: value mirrored by rule)', () {
    testWidgets('setters, methods, record-valued state', (tester) async {
      final b = Bridge();
      final node = b.node('gen_TextEditingController', {'text': 'hello'});
      final h = node.ownHandle = GenTextEditingControllerHandle(node);
      final c = h.object;
      expect(c.text, 'hello');
      await tester.pumpWidget(host(TextField(controller: c)));
      await tester.pump();
      expect(b.mirrored(node)['value']['text'], 'hello');

      await b.call(node, r'$set', {'name': 'text', 'value': 'bye'});
      expect(c.text, 'bye');
      expect(b.states(node).last['value']['text'], 'bye');

      await b.call(node, r'$set', {
        'name': 'selection',
        'value': {'baseOffset': 1, 'extentOffset': 3},
      });
      expect(c.selection, const TextSelection(baseOffset: 1, extentOffset: 3));
      final sel = b.states(node).last['value']['selection'] as Map;
      expect(sel['baseOffset'], 1);
      expect(sel['extentOffset'], 3);
      expect(sel['affinity'], 'downstream');

      // user typing reaches JS through the same push
      await tester.enterText(find.byType(TextField), 'typed');
      expect(b.states(node).last['value']['text'], 'typed');

      await b.call(node, 'clear');
      expect(c.text, '');
      expect(await b.call(node, r'$get', {'name': 'text'}), '');
    });

    testWidgets('named constructor: fromValue', (tester) async {
      final b = Bridge();
      final node = b.node('gen_TextEditingController', {
        r'$ctor': 'fromValue',
        'value': {
          'text': 'abc',
          'selection': {r'$': 'collapsed', 'offset': 2},
        },
      });
      final c = (node.ownHandle = GenTextEditingControllerHandle(node)).object;
      expect(c.value.text, 'abc');
      expect(c.selection.baseOffset, 2);
    });
  });

  group('PageController', () {
    testWidgets('page RPCs and the guarded page mirror', (tester) async {
      final b = Bridge();
      final node = b.node('gen_PageController', {'initialPage': 1});
      final h = node.ownHandle = GenPageControllerHandle(node);
      final c = h.object;
      await tester.pump();
      expect(b.mirrored(node), isEmpty); // page asserts when unattached: guarded out
      await tester.pumpWidget(host(PageView(controller: c, children: [for (var i = 0; i < 4; i++) Text('p$i')])));
      await tester.pump();
      expect(b.mirrored(node), {'page': 1});

      await b.call(node, 'jumpToPage', {'page': 3});
      await tester.pump();
      expect(c.page, 3);
      expect(b.mirrored(node), {'page': 3});

      final f = b.call(node, 'previousPage', {'duration': 100, 'curve': 'Curves.linear'});
      await tester.pumpAndSettle();
      expect(await f, null);
      expect(c.page, 2);
      expect(b.mirrored(node), {'page': 2});
    });
  });

  group('AnimationController (vsync is environmental)', () {
    testWidgets('constructed without a State; forward resolves on completion; status pushed, value not', (tester) async {
      final b = Bridge();
      final node = b.node('gen_AnimationController', {'duration': 200});
      final h = node.ownHandle = GenAnimationControllerHandle(node);
      final c = h.object;
      expect(c.duration, const Duration(milliseconds: 200));
      // It is an Animation<double>: usable directly as a widget argument.
      expect(node.handle<Animation<double>>(), same(c));
      await tester.pumpWidget(host(FadeTransition(opacity: c, child: const Text('x'))));
      await tester.pump();
      expect(b.mirrored(node), {'status': 'dismissed', 'isAnimating': false});

      var resolved = false;
      final f = b.call(node, 'forward', {'from': 0}).then((r) {
        resolved = true;
        return r;
      });
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(c.value, closeTo(0.5, 0.01));
      expect(resolved, false);
      expect(b.mirrored(node), {'status': 'forward', 'isAnimating': true});
      await tester.pumpAndSettle();
      expect(await f, null);
      expect(resolved, true);
      expect(c.value, 1.0);
      expect(b.mirrored(node), {'status': 'completed', 'isAnimating': false});
      // Per-frame value was never pushed: only status / isAnimating transitions.
      expect(b.states(node).every((s) => !s.containsKey('value')), true);
      expect(b.states(node).length, lessThanOrEqualTo(4));
      expect(await b.call(node, r'$get', {'name': 'value'}), 1);

      // setter, then a state change with no notification (stop) is still mirrored
      await b.call(node, r'$set', {'name': 'duration', 'value': 1000});
      expect(c.duration, const Duration(seconds: 1));
      unawaited(b.call(node, 'reverse'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(b.mirrored(node)['isAnimating'], true);
      await b.call(node, 'stop');
      expect(c.isAnimating, false);
      expect(b.mirrored(node)['isAnimating'], false);
    });

    testWidgets('disposing mid-animation rejects the pending call with a typed TickerCanceled', (tester) async {
      final b = Bridge();
      final node = b.node('gen_AnimationController', {'duration': 500});
      node.ownHandle = GenAnimationControllerHandle(node);
      final f = b.call(node, 'forward');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      b.dispose(node);
      final r = await f;
      expect(isErr(r, 'TickerCanceled'), true, reason: '$r');
      await tester.pump(const Duration(seconds: 1)); // no ticker left running
    });
  });

  group('TabController', () {
    testWidgets('index mirror collapses the double notification; setter jumps; animateTo animates', (tester) async {
      final b = Bridge();
      final node = b.node('gen_TabController', {'length': 3, 'initialIndex': 1});
      final h = node.ownHandle = GenTabControllerHandle(node);
      final c = h.object;
      expect(c.length, 3);
      await tester.pumpWidget(host(Column(children: [
        TabBar(controller: c, tabs: const [Tab(text: 'a'), Tab(text: 'b'), Tab(text: 'c')]),
        Expanded(child: TabBarView(controller: c, children: const [Text('A'), Text('B'), Text('C')])),
      ])));
      await tester.pump();
      expect(b.mirrored(node), {'index': 1, 'indexIsChanging': false});

      await b.call(node, 'animateTo', {'value': 2, 'duration': 100});
      await tester.pumpAndSettle();
      expect(c.index, 2);
      expect(b.mirrored(node), {'index': 2, 'indexIsChanging': false});
      // exactly one index push for the change
      expect(b.states(node).where((s) => s['index'] == 2).length, 1);

      await b.call(node, r'$set', {'name': 'index', 'value': 0});
      await tester.pumpAndSettle();
      expect(c.index, 0);
      expect(b.mirrored(node)['index'], 0);
      expect(await b.call(node, r'$get', {'name': 'length'}), 3);

      // A tap on the real TabBar reaches JS.
      await tester.tap(find.text('b'));
      await tester.pumpAndSettle();
      expect(b.mirrored(node)['index'], 1);

      // RangeError from Flutter stays typed.
      final r = await b.call(node, r'$set', {'name': 'index', 'value': 9});
      expect(r[kErr], isA<Map>());
    });
  });

  group('VideoPlayerController (pub.dev, ValueNotifier<VideoPlayerValue>)', () {
    testWidgets('named constructor with a Uri, async methods, record state, Future getter', (tester) async {
      final fake = FakeVideoPlatform();
      VideoPlayerPlatform.instance = fake;
      final b = Bridge();
      final node = b.node('gen_VideoPlayerController', {
        r'$ctor': 'networkUrl',
        'url': 'https://example.com/a.mp4',
        'videoPlayerOptions': {'mixWithOthers': true},
      });
      final h = node.ownHandle = GenVideoPlayerControllerHandle(node);
      final c = h.object;
      expect(c.dataSource, 'https://example.com/a.mp4');
      expect(c.dataSourceType, DataSourceType.network);
      expect(c.videoPlayerOptions!.mixWithOthers, true);

      await tester.runAsync(() async {
        expect(await b.call(node, 'initialize'), null);
        await Future<void>.delayed(Duration.zero);
      });
      expect(c.value.isInitialized, true);
      final v = b.mirrored(node)['value'] as Map;
      expect(v['isInitialized'], true);
      expect(v['duration'], 10000); // Duration -> ms
      expect(v['size'], {'width': 640.0, 'height': 480.0});
      expect(v['isPlaying'], false);

      await tester.runAsync(() async {
        expect(await b.call(node, 'setVolume', {'volume': 0.25}), null);
        expect(await b.call(node, 'seekTo', {'position': 1500}), null);
        expect(await b.call(node, 'play'), null);
        expect(await b.call(node, r'$get', {'name': 'position'}), 1500); // Future<Duration?> getter
      });
      expect(fake.log, containsAllInOrder(['init', 'create', 'setVolume 0.25', 'seekTo 1500', 'play']));
      expect((b.mirrored(node)['value'] as Map)['isPlaying'], true);
      expect((b.mirrored(node)['value'] as Map)['volume'], 0.25);

      await tester.runAsync(() async {
        await b.call(node, 'pause');
        b.dispose(node);
        await Future<void>.delayed(Duration.zero);
      });
      expect(fake.log.last, 'dispose');
    });
  });
}

class FakeVideoPlatform extends VideoPlayerPlatform {
  final log = <String>[];
  final events = StreamController<VideoEvent>();
  Duration position = Duration.zero;

  @override
  Future<void> init() async => log.add('init');
  @override
  Future<int?> createWithOptions(VideoCreationOptions options) async {
    log.add('create');
    scheduleMicrotask(() => events.add(VideoEvent(
          eventType: VideoEventType.initialized,
          duration: const Duration(seconds: 10),
          size: const Size(640, 480),
        )));
    return 7;
  }

  @override
  Stream<VideoEvent> videoEventsFor(int playerId) => events.stream;
  @override
  Future<void> setMixWithOthers(bool mixWithOthers) async {}
  @override
  Future<void> setLooping(int playerId, bool looping) async {}
  @override
  Future<void> setVolume(int playerId, double volume) async => log.add('setVolume $volume');
  @override
  Future<void> setPlaybackSpeed(int playerId, double speed) async {}
  @override
  Future<void> play(int playerId) async => log.add('play');
  @override
  Future<void> pause(int playerId) async => log.add('pause');
  @override
  Future<void> seekTo(int playerId, Duration position) async {
    this.position = position;
    log.add('seekTo ${position.inMilliseconds}');
  }

  @override
  Future<Duration> getPosition(int playerId) async => position;
  @override
  Future<void> dispose(int playerId) async => log.add('dispose');
}
