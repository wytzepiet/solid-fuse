import { For, createSignal } from "solid-js";
import { Pressable, Text, View, bouncy, createSpring, lerp, lerpColor } from "solid-fuse";

// Springs: follow a signal, an entrance, and set/await.
export function SpringsScreen() {
  const [pressed, setPressed] = createSignal(false);
  const [scale] = createSpring(() => (pressed() ? 1.2 : 1), bouncy);

  const [open, setOpen] = createSignal(false);
  const [t] = createSpring(() => (open() ? 1 : 0));

  const [x, setX] = createSpring(0);
  const [steps, setSteps] = createSignal("");
  const run = async () => {
    setSteps("right");
    await setX(160);
    setSteps("back");
    await setX(0);
    setSteps("done");
  };

  return (
    <View layout={{ direction: "vertical", gap: 24 }} padding={24}>
      <Pressable testId="bubble" onPressedChange={setPressed}>
        <View
          width={64}
          height={64}
          decoration={{ color: "#2563eb", borderRadius: 32 }}
          transform={{ scale: scale() }}
        />
      </Pressable>

      <Pressable testId="toggle" onPress={() => setOpen((o) => !o)}>
        <View
          height={56}
          padding={{ horizontal: 16 }}
          layout={{ justify: "center" }}
          decoration={{ color: lerpColor(t(), "#e5e7eb", "#16a34a"), borderRadius: 12 }}
          transform={{ translateX: lerp(t(), 0, 40) }}
        >
          <Text color={lerpColor(t(), "#111827", "#ffffff")}>{open() ? "On" : "Off"}</Text>
        </View>
      </Pressable>

      <View layout={{ direction: "horizontal", gap: 8 }}>
        <For each={[0, 1, 2, 3, 4]}>
          {(i) => {
            const [y] = createSpring(0, { from: 40, delay: i * 0.05 });
            return <View width={24} height={24} decoration={{ color: "#f59e0b", borderRadius: 4 }} transform={{ translateY: y() }} />;
          }}
        </For>
      </View>

      <Pressable testId="run" onPress={run}>
        <View width={40} height={40} decoration={{ color: "#db2777", borderRadius: 8 }} transform={{ translateX: x() }} />
      </Pressable>
      <Text testId="steps">{steps()}</Text>
    </View>
  );
}
