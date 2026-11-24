import { For } from "solid-js";
import { Pressable, Text, View, useTabs } from "solid-fuse";

// Tabs: a stack per tab, kept alive; the bar sits next to the visible one.
export const tabs = ["feed", "profile"];

export default function Tabs(props: { children?: JSX.Element }) {
  const t = useTabs();
  return (
    <View layout={{ direction: "vertical" }} width={Infinity} height={Infinity}>
      <View flex={1}>{props.children}</View>
      <View layout={{ direction: "horizontal", justify: "spaceAround" }} padding={16} decoration={{ color: "#F3F4F6" }}>
        <For each={["Feed tab", "Profile tab"]}>
          {(label, i) => (
            <Pressable onPress={() => t.select(i())}>
              <Text fontWeight={t.index() === i() ? 700 : 400}>{label}</Text>
            </Pressable>
          )}
        </For>
      </View>
    </View>
  );
}
