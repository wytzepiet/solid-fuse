import { For, createSignal, onCleanup } from "solid-js";
import { Text, View } from "solid-fuse";

// requestAnimationFrame on Flutter's vsync: one clock drives `count` boxes,
// each a prop write per frame. The frame benchmark (dart/lib/frame_bench.dart)
// opens it with 10, 64 and 200.
export function FramesScreen(props: { count?: number }) {
  const count = props.count ?? 3;
  const [t, setT] = createSignal(0);
  const [fps, setFps] = createSignal(0);
  let frame = 0;
  let last = 0;
  let frames = 0;

  const loop = (time: number) => {
    setT(time);
    frames++;
    if (time - last >= 1000) {
      setFps(Math.round((frames * 1000) / (time - last)));
      frames = 0;
      last = time;
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame((time) => {
    last = time;
    loop(time);
  });
  onCleanup(() => cancelAnimationFrame(frame));

  return (
    <View layout={{ direction: "vertical", gap: 2 }} padding={16}>
      <Text testId="fps" fontSize={15}>{`${fps()} fps, ${count} boxes`}</Text>
      <For each={Array.from({ length: count }, (_, i) => i)}>
        {(i) => (
          <View
            width={24}
            height={count > 20 ? 2 : 24}
            decoration={{ color: "#2563eb", borderRadius: 4 }}
            transform={{ translateX: 120 + 100 * Math.sin(t() / 300 + i * 0.3) }}
          />
        )}
      </For>
    </View>
  );
}
