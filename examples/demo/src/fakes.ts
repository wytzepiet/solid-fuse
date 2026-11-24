// Stand-ins for native capabilities, where there are none: a headless run
// (`fuse dev --headless`) and a web preview. Never in a phone build.
import { fake } from "solid-fuse";
import { GeolocatorPlatform, Position } from "#fuse/geolocator_platform_interface";
import { SensorsPlatform, AccelerometerEvent } from "#fuse/sensors_plus_platform_interface";
import { DateTime } from "#fuse/flutter";

// Amsterdam, Dam Square.
fake(GeolocatorPlatform, {
  checkPermission: () => "always",
  isLocationServiceEnabled: () => true,
  getCurrentPosition: () => position(52.3731, 4.8926),
});

// The phone tilting back and forth, ten times a second.
fake(SensorsPlatform, {
  accelerometerEventStream: async function* () {
    for (let t = 0; ; t++) {
      await new Promise((r) => setTimeout(r, 100));
      yield AccelerometerEvent(Math.sin(t / 10) * 3, 0, 9.81, DateTime.now());
    }
  },
});

function position(latitude: number, longitude: number) {
  return Position({
    latitude,
    longitude,
    timestamp: DateTime.now(),
    accuracy: 5,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    headingAccuracy: 0,
    speed: 0,
    speedAccuracy: 0,
  });
}
