import { createSignal } from "solid-js";
import { AppBar, Button, Scaffold } from "@solid-fuse/material";
import { Text, View } from "solid-fuse";

export default function Home() {
  const [count, setCount] = createSignal(0);
  return (
    <Scaffold appBar={<AppBar title="{{title}}" />}>
      <View width={Infinity} height={Infinity} layout={{ align: "center", justify: "center", gap: 16 }}>
        <Text fontSize={48}>{count()}</Text>
        <Button onPress={() => setCount(count() + 1)}>
          Add one
        </Button>
      </View>
    </Scaffold>
  );
}
