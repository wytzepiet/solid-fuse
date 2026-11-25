// What of the Dart side crosses to JS (`#fuse/flutter`): ListView, for the
// builder screen's ListView.builder, and its ScrollController.
export 'package:flutter/widgets.dart' show ListView, ScrollController;

// The sensors screen: GPS and the accelerometer. Their platform interfaces
// cross too, so src/fakes.ts can stand in for them where there are none.
export 'package:geolocator/geolocator.dart' show Geolocator;
export 'package:geolocator_platform_interface/geolocator_platform_interface.dart' show GeolocatorPlatform, Position;
export 'package:sensors_plus/sensors_plus.dart' show accelerometerEventStream;
export 'package:sensors_plus_platform_interface/sensors_plus_platform_interface.dart' show SensorsPlatform, AccelerometerEvent;
