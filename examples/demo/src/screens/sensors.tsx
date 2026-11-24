import { createSignal, onCleanup } from "solid-js";
import { Text, View } from "solid-fuse";
import { Geolocator } from "#fuse/geolocator";
import { accelerometerEventStream } from "#fuse/sensors_plus";
import { Button } from "../ui";

// Native capabilities: on a phone these are the real GPS and accelerometer.
// Headless and on the web, src/fakes.ts stands in for them.
export function SensorsScreen() {
  const [here, setHere] = createSignal("");
  const [tilt, setTilt] = createSignal("");
  let stopped = false;
  onCleanup(() => (stopped = true));

  const locate = async () => {
    try {
      const p = await Geolocator.getCurrentPosition();
      setHere(`${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`);
    } catch (e) {
      setHere(`no position: ${e instanceof Error ? e.message : e}`);
    }
  };

  void (async () => {
    try {
      for await (const e of accelerometerEventStream()) {
        if (stopped) break;
        setTilt(`x ${e.x.toFixed(2)}  y ${e.y.toFixed(2)}  z ${e.z.toFixed(2)}`);
      }
    } catch (e) {
      setTilt(`no accelerometer: ${e instanceof Error ? e.message : e}`);
    }
  })();

  return (
    <View layout={{ direction: "vertical", gap: 16 }} padding={24}>
      <Text fontSize={20} fontWeight={700}>
        Position
      </Text>
      <Button onTap={locate}>Where am I?</Button>
      <Text testId="position">{here()}</Text>
      <Text fontSize={20} fontWeight={700}>
        Accelerometer
      </Text>
      <Text testId="tilt">{tilt()}</Text>
    </View>
  );
}
