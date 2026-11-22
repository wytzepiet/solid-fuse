import { createSignal, For } from "solid-js";
import { Text, View } from "solid-fuse";
import { Button, Row } from "../ui";

// A keyed list that is reordered in place: Solid moves the existing row
// nodes instead of recreating them.
export function ListScreen() {
  const [rows, setRows] = createSignal(["cherry", "apple", "elder", "banana", "date"]);

  return (
    <View flex={{ direction: "vertical", gap: 12 }} padding={24}>
      <Row>
        <Button onTap={() => setRows((r) => r.slice().reverse())}>Reverse</Button>
        <Button onTap={() => setRows((r) => r.slice().sort())}>Sort</Button>
        <Button onTap={() => setRows((r) => r.filter((_, i) => i % 2 === 0))}>Thin</Button>
      </Row>
      <For each={rows()}>
        {(row) => (
          // A lowercase tag is the wire element itself; `height` is a static
          // attribute sent with the node's creation.
          <view height={40}>
            <Text fontSize={16}>{row}</Text>
          </view>
        )}
      </For>
    </View>
  );
}
