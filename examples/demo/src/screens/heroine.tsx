import { For } from "solid-js";
import { Pressable, Text, View, useNavigation } from "solid-fuse";
import { CupertinoMotion, DragDismissable, Heroine, heroinePage } from "@solid-fuse/heroine";

const colors = ["#2563eb", "#db2777", "#16a34a", "#f59e0b"] as const;
type Tile = (typeof colors)[number];

// heroine: tiles fly on a spring into a page you can drag away. The app's
// Navigator has the HeroineController as an observer (src/index.tsx).
export function HeroineScreen() {
  const nav = useNavigation();
  const open = (color: Tile) =>
    nav.push(
      heroinePage({
        child: () => (
          <DragDismissable>
            <View width={Infinity} height={Infinity} layout={{ justify: "center", align: "center" }}>
              <Heroine tag={color} motion={CupertinoMotion.bouncy()}>
                <View testId="heroine-big" width={280} height={280} decoration={{ color, borderRadius: 32 }} />
              </Heroine>
            </View>
          </DragDismissable>
        ),
      }),
    );

  return (
    <View layout={{ direction: "vertical", gap: 16 }} padding={24}>
      <View layout={{ direction: "horizontal", gap: 16 }}>
        <For each={colors}>
          {(color) => (
            <Pressable testId={`heroine-${color}`} onPress={() => open(color)}>
              <Heroine tag={color} motion={CupertinoMotion.bouncy()}>
                <View width={72} height={72} decoration={{ color, borderRadius: 12 }} />
              </Heroine>
            </Pressable>
          )}
        </For>
      </View>
      <Text>Tap a tile, then drag it away.</Text>
    </View>
  );
}
