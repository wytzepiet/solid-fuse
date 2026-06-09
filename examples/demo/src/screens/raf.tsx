import { createSignal, onCleanup } from "solid-js";
import { GestureDetector, Text, View } from "solid-fuse";

// Verifies the vsync-driven requestAnimationFrame shim:
//   • a box slides back and forth, one update per real frame;
//   • each frame logs its delta to the `fuse dev` console — a steady ~16.7ms
//     (60Hz) / ~8.3ms (120Hz) cadence proves the clock is Flutter's vsync;
//   • after ~3s it stops calling rAF, and the loop idles (no more ticks) —
//     proof that nothing is driven when nothing is animating.
const DURATION_MS = 3000;
const TRACK = 260;
const BOX = 56;

export function RafScreen() {
  const [x, setX] = createSignal(0);
  const [running, setRunning] = createSignal(false);
  let rafId = 0;
  let startTs = 0;
  let lastTs = 0;
  let frames = 0;

  const tick = (ts: number) => {
    const delta = lastTs ? ts - lastTs : 0;
    lastTs = ts;
    if (!startTs) startTs = ts;
    const elapsed = ts - startTs;
    frames++;

    // Slide the box across the track on a sine, purely as a function of the
    // vsync timestamp — no interpolation state to drift.
    const span = TRACK - BOX;
    setX((span / 2) * (1 - Math.cos(elapsed / 500)));

    console.log(`raf frame ${frames}  Δ=${delta.toFixed(2)}ms  t=${elapsed.toFixed(0)}ms`);

    if (elapsed < DURATION_MS) {
      rafId = requestAnimationFrame(tick);
    } else {
      console.log(`raf idle — ran ${frames} frames over ${elapsed.toFixed(0)}ms, ~${(frames / (elapsed / 1000)).toFixed(1)}fps`);
      setRunning(false);
    }
  };

  const start = () => {
    if (running()) return;
    startTs = 0;
    lastTs = 0;
    frames = 0;
    setRunning(true);
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(rafId);
    setRunning(false);
    console.log("raf cancelled");
  };

  onCleanup(() => cancelAnimationFrame(rafId));

  return (
    <View flex={{ direction: "vertical", gap: 32 }} padding={24}>
      <Text fontSize={20} fontWeight="bold">
        requestAnimationFrame
      </Text>
      <Text color="#6B7280" fontSize={14}>
        Driven by Flutter's vsync. Watch the per-frame delta in the dev console.
      </Text>

      <View width={TRACK} height={BOX} decoration={{ color: "#F3F4F6", borderRadius: 12 }}>
        <View padding={{ left: x() }}>
          <View
            width={BOX}
            height={BOX}
            decoration={{ color: "#2563eb", borderRadius: 12 }}
          />
        </View>
      </View>

      <View flex={{ direction: "horizontal", gap: 12 }}>
        <GestureDetector onTap={start}>
          <View
            padding={{ horizontal: 20, vertical: 12 }}
            decoration={{ color: running() ? "#9CA3AF" : "#22c55e", borderRadius: 8 }}
          >
            <Text color="#fff" fontWeight="semiBold">
              {running() ? "running…" : "play"}
            </Text>
          </View>
        </GestureDetector>
        <GestureDetector onTap={stop}>
          <View
            padding={{ horizontal: 20, vertical: 12 }}
            decoration={{ color: "#ef4444", borderRadius: 8 }}
          >
            <Text color="#fff" fontWeight="semiBold">
              stop
            </Text>
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}
