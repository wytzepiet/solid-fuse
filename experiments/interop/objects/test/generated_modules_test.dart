// Drives GENERATED plugin modules through their channel handler (what
// `channels.call("mod:<name>", {m, a})` reaches) with the plugin's platform
// interface faked, and asserts the real package API was called.
import 'dart:async';
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fuse_objects_spike/fuse_obj_support.dart';
import 'package:fuse_objects_spike/generated/geolocator.g.dart';
import 'package:fuse_objects_spike/generated/shared_preferences.g.dart';
import 'package:fuse_objects_spike/generated/url_launcher.g.dart';
import 'package:geolocator_platform_interface/geolocator_platform_interface.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:solid_fuse/solid_fuse.dart';
import 'package:url_launcher_platform_interface/link.dart';
import 'package:url_launcher_platform_interface/url_launcher_platform_interface.dart';

/// Stands in for FuseChannels + the runtime's node registry.
class FakeRuntime {
  FakeRuntime() {
    registry.create(0, 'root', {});
  }
  final handlers = <String, FutureOr<dynamic> Function(Map<String, dynamic>)>{};
  final sent = <(String, Map<String, dynamic>)>[];
  final calls = <(int, String, dynamic)>[];
  late final registry = FuseNodeRegistry(callFunction: (id, name, [v]) => calls.add((id, name, v)));

  late final bridge = FuseBridge(
    on: (channel, handler) => handlers[channel] = handler,
    send: (channel, data) => sent.add((channel, Map<String, dynamic>.from(jsonDecode(jsonEncode(data)) as Map))),
    registry: registry,
  );

  /// `m.invoke(method, args)` on the JS side.
  Future<dynamic> invoke(String module, String method, [Map<String, dynamic> args = const {}]) async {
    final r = await handlers['mod:$module']!(Map<String, dynamic>.from(jsonDecode(jsonEncode({'m': method, 'a': args})) as Map));
    return jsonDecode(jsonEncode(r));
  }

  /// `_handleCall` for an object the module handed out.
  Future<dynamic> call(Map ref, String method, [Map<String, dynamic>? args]) async {
    final r = await registry.get(ref['_node'] as int).ownHandle!.call(method, args == null ? null : jsonDecode(jsonEncode(args)));
    return jsonDecode(jsonEncode(r));
  }
}

class FakeLauncher extends UrlLauncherPlatform with MockPlatformInterfaceMixin {
  final log = <String>[];
  @override
  final LinkDelegate? linkDelegate = null;
  @override
  Future<bool> canLaunch(String url) async => url.startsWith('https');
  @override
  Future<bool> launchUrl(String url, LaunchOptions options) async {
    if (url.startsWith('boom')) throw PlatformException(code: 'ACTIVITY_NOT_FOUND', message: 'no activity', details: 'boom');
    log.add('$url ${options.mode.name} js=${options.webViewConfiguration.enableJavaScript} headers=${options.webViewConfiguration.headers}');
    return true;
  }

  @override
  Future<bool> supportsMode(PreferredLaunchMode mode) async => mode != PreferredLaunchMode.inAppBrowserView;
}

class FakeGeolocator extends GeolocatorPlatform with MockPlatformInterfaceMixin {
  final positions = StreamController<Position>.broadcast();
  var listeners = 0;
  LocationSettings? lastSettings;
  @override
  Future<LocationPermission> checkPermission() async => LocationPermission.whileInUse;
  @override
  Future<bool> isLocationServiceEnabled() async => true;
  @override
  Future<Position> getCurrentPosition({LocationSettings? locationSettings}) async {
    lastSettings = locationSettings;
    return pos(52.37, 4.89);
  }

  @override
  Stream<Position> getPositionStream({LocationSettings? locationSettings}) {
    lastSettings = locationSettings;
    final c = StreamController<Position>(onListen: () => listeners++, onCancel: () => listeners--);
    final sub = positions.stream.listen(c.add);
    c.onCancel = () {
      listeners--;
      sub.cancel();
    };
    return c.stream;
  }
}

Position pos(double lat, double lng) => Position(
      longitude: lng,
      latitude: lat,
      timestamp: DateTime.utc(2026, 1, 2, 3, 4, 5),
      accuracy: 5,
      altitude: 1,
      altitudeAccuracy: 1,
      heading: 90,
      headingAccuracy: 1,
      speed: 2,
      speedAccuracy: 1,
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('url_launcher (top-level functions)', () {
    late FakeRuntime rt;
    late FakeLauncher fake;
    setUp(() {
      rt = FakeRuntime();
      UrlLauncherPlatform.instance = fake = FakeLauncher();
      registerUrlLauncherModule(rt.bridge);
    });

    test('launchUrl: Uri from a string, enum, nested record with a map', () async {
      final r = await rt.invoke('url_launcher', 'launchUrl', {
        'url': 'https://solidjs.com/docs?x=1',
        'mode': 'externalApplication',
        'webViewConfiguration': {
          'enableJavaScript': false,
          'headers': {'x-a': 'b'},
        },
      });
      expect(r, true);
      expect(fake.log.single, 'https://solidjs.com/docs?x=1 externalApplication js=false headers={x-a: b}');
    });

    test('defaults are Flutter\'s, results are typed values', () async {
      expect(await rt.invoke('url_launcher', 'launchUrl', {'url': 'https://a.b'}), true);
      expect(fake.log.single, 'https://a.b platformDefault js=true headers={}');
      expect(await rt.invoke('url_launcher', 'canLaunchUrl', {'url': 'https://a.b'}), true);
      expect(await rt.invoke('url_launcher', 'canLaunchUrl', {'url': 'tel:1'}), false);
      expect(await rt.invoke('url_launcher', 'supportsLaunchMode', {'mode': 'inAppBrowserView'}), false);
      expect(await rt.invoke('url_launcher', 'launchUrlString', {'urlString': 'https://c.d'}), true);
    });

    test('errors: missing argument, bad enum, plugin failure, unknown function', () async {
      final r1 = await rt.invoke('url_launcher', 'launchUrl', {});
      expect((r1[kErr] as Map)['type'], 'ArgumentError');
      final r2 = await rt.invoke('url_launcher', 'launchUrl', {'url': 'https://a.b', 'mode': 'nope'});
      expect((r2[kErr] as Map)['type'], 'ArgumentError');
      final r3 = await rt.invoke('url_launcher', 'launchUrl', {'url': 'boom://x'});
      expect(r3[kErr], containsPair('type', 'PlatformException'));
      expect(r3[kErr], containsPair('code', 'ACTIVITY_NOT_FOUND'));
      expect(r3[kErr], containsPair('message', 'no activity'));
      expect(r3[kErr], containsPair('details', 'boom'));
      final r4 = await rt.invoke('url_launcher', 'launch', {});
      expect(r4[kErr], containsPair('type', 'UnknownMember'));
    });
  });

  group('shared_preferences (static factory returning an instance)', () {
    late FakeRuntime rt;
    setUp(() {
      rt = FakeRuntime();
      SharedPreferences.setMockInitialValues({'greeting': 'hi', 'n': 3});
      registerSharedPreferencesModule(rt.bridge);
    });

    test('getInstance hands out an object; its methods hit the real SharedPreferences', () async {
      final ref = await rt.invoke('shared_preferences', 'SharedPreferences.getInstance') as Map;
      expect(ref['type'], 'shared_preferences_SharedPreferences');
      expect(ref['_node'], lessThan(0));
      expect(await rt.call(ref, 'getString', {'key': 'greeting'}), 'hi');
      expect(await rt.call(ref, 'getInt', {'key': 'n'}), 3);
      expect(await rt.call(ref, 'getString', {'key': 'missing'}), null);
      expect(await rt.call(ref, 'setStringList', {'key': 'l', 'value': ['a', 'b']}), true);
      expect(await rt.call(ref, 'setBool', {'key': 'flag', 'value': true}), true);
      expect(await rt.call(ref, 'getKeys'), unorderedEquals(['greeting', 'n', 'l', 'flag']));
      expect(await rt.call(ref, 'get', {'key': 'l'}), ['a', 'b']);

      final real = await SharedPreferences.getInstance();
      expect(real.getStringList('l'), ['a', 'b']);
      expect(real.getBool('flag'), true);

      // wrong type stored: the package's own error crosses typed
      final r = await rt.call(ref, 'getInt', {'key': 'greeting'});
      expect(r[kErr], isA<Map>());
    });

    test('identity: the singleton maps to one node; releasing it does not dispose anything', () async {
      final a = await rt.invoke('shared_preferences', 'SharedPreferences.getInstance') as Map;
      final b = await rt.invoke('shared_preferences', 'SharedPreferences.getInstance') as Map;
      expect(a['_node'], b['_node']);
      rt.registry.remove(a['_node'] as int); // JS dispose op
      expect(rt.registry.tryGet(a['_node'] as int), isNull);
      final c = await rt.invoke('shared_preferences', 'SharedPreferences.getInstance') as Map;
      expect(c['_node'], isNot(a['_node'])); // adopted again under a new id
      expect(await rt.call(c, 'getString', {'key': 'greeting'}), 'hi');
    });
  });

  group('geolocator (static methods, records out, streams as subscriptions)', () {
    late FakeRuntime rt;
    late FakeGeolocator fake;
    setUp(() {
      rt = FakeRuntime();
      GeolocatorPlatform.instance = fake = FakeGeolocator();
      registerGeolocatorModule(rt.bridge);
    });

    test('Future<record> and Future<enum> results', () async {
      expect(await rt.invoke('geolocator', 'Geolocator.checkPermission'), 'whileInUse');
      final p = await rt.invoke('geolocator', 'Geolocator.getCurrentPosition', {
        'locationSettings': {'accuracy': 'high', 'distanceFilter': 10},
      }) as Map;
      expect(p['latitude'], 52.37);
      expect(p['longitude'], 4.89);
      expect(p['timestamp'], '2026-01-02T03:04:05.000Z');
      expect(fake.lastSettings!.accuracy, LocationAccuracy.high);
      expect(fake.lastSettings!.distanceFilter, 10);
      // pure static helper, sync in Dart, still a Promise in JS
      expect(await rt.invoke('geolocator', 'Geolocator.distanceBetween', {
        'startLatitude': 0, 'startLongitude': 0, 'endLatitude': 0, 'endLongitude': 1,
      }), closeTo(111319, 100));
    });

    test('a Stream becomes a subscription: listen, events, cancel', () async {
      expect(await rt.invoke('geolocator', r'$listen', {r'$stream': 'Geolocator.getPositionStream', r'$id': 1}), null);
      await Future<void>.delayed(Duration.zero);
      expect(fake.listeners, 1);
      fake.positions.add(pos(1, 2));
      fake.positions.add(pos(3, 4));
      await Future<void>.delayed(Duration.zero);
      final events = rt.sent.where((e) => e.$1 == 'mod:geolocator:event').map((e) => e.$2).toList();
      expect(events.length, 2);
      expect(events[0]['id'], 1);
      expect(events[0]['v']['latitude'], 1);
      expect(events[1]['v']['longitude'], 4);
      expect(await rt.invoke('geolocator', r'$cancel', {r'$id': 1}), null);
      await Future<void>.delayed(Duration.zero);
      expect(fake.listeners, 0);
      fake.positions.add(pos(5, 6));
      await Future<void>.delayed(Duration.zero);
      expect(rt.sent.where((e) => e.$1 == 'mod:geolocator:event').length, 2);
    });
  });
}
