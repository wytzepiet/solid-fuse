import { For } from "solid-js";
import { Navigator, Pressable, Tabs, Text, View, usePage } from "solid-fuse";

// Holds tabs/: a stack per tab, kept alive; the bar sits under them.
const tabs = [
  { index: "/tabs", label: "Feed tab" },
  { index: "/tabs/profile", label: "Profile tab" },
];

export default function TabsPage() {
  const page = usePage();
  return (
    <View layout={{ direction: "vertical" }} width={Infinity} height={Infinity}>
      <View flex={1}>
        <Tabs>
          <For each={tabs}>{(t) => <Navigator index={t.index} />}</For>
        </Tabs>
      </View>
      <View layout={{ direction: "horizontal", justify: "spaceAround" }} padding={16} decoration={{ color: "#F3F4F6" }}>
        <For each={tabs}>
          {(t) => (
            <Pressable onPress={() => page.show(t.index)}>
              <Text fontWeight={page.active() === t.index ? 700 : 400}>{t.label}</Text>
            </Pressable>
          )}
        </For>
      </View>
    </View>
  );
}
