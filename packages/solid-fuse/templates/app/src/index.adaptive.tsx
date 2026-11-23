import { createSignal } from "solid-js";
import { AdaptiveApp, Button } from "@solid-fuse/adaptive";
import { Navigator, Text, View, render } from "solid-fuse";

// Cupertino on iOS and macOS, Material elsewhere.
function Home() {
  const [count, setCount] = createSignal(0);
  return (
    <View width={Infinity} height={Infinity} layout={{ align: "center", justify: "center", gap: 16 }}>
      <Text fontSize={48}>{count()}</Text>
      <Button onPress={() => setCount(count() + 1)}>
        Add one
      </Button>
    </View>
  );
}

render(() => (
  <AdaptiveApp title="{{title}}" theme={{ seedColor: "#2563eb" }} themeMode="system">
    <Navigator initialPage={() => <Home />} />
  </AdaptiveApp>
));
