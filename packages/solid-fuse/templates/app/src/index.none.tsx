import { createSignal } from "solid-js";
import { App, Navigator, Pressable, Text, View, render } from "solid-fuse";

// No design package: core widgets only. Add one later with
// `bun add @solid-fuse/material` (or cupertino, adaptive).
function Home() {
  const [count, setCount] = createSignal(0);
  return (
    <View width={Infinity} height={Infinity} decoration={{ color: "#ffffff" }} layout={{ align: "center", justify: "center", gap: 16 }}>
      <Text fontSize={48} color="#111827">{count()}</Text>
      <Pressable testId="add" onPress={() => setCount(count() + 1)}>
        <View padding={{ horizontal: 20, vertical: 12 }} decoration={{ color: "#2563eb", borderRadius: 8 }}>
          <Text color="#ffffff" fontSize={16}>Add one</Text>
        </View>
      </Pressable>
    </View>
  );
}

render(() => (
  <App title="{{title}}">
    <Navigator initialPage={() => <Home />} />
  </App>
));
