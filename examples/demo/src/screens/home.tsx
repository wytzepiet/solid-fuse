import { ScrollView, Text, View, on, useNavigation } from "solid-fuse";
import { MenuItem } from "../ui";
import { CounterScreen } from "./counter";
import { TextFieldScreen } from "./text-field";
import { IconScreen } from "./icon";
import { ScrollScreen } from "./scroll";
import { ListScreen } from "./list";
import { BuilderScreen } from "./builder";
import { CoreScreen } from "./core";
import { MaterialScreen } from "./material";
import { CupertinoScreen } from "./cupertino";
import { AdaptiveScreen } from "./adaptive";
import { FramesScreen } from "./frames";
import { SpringsScreen } from "./springs";

export function HomeScreen() {
  const nav = useNavigation();
  // The frame benchmark (dart/lib/frame_bench.dart) opens and closes it.
  on("benchFrames", ({ count }: { count?: number }) => {
    if (count) nav.push(() => <FramesScreen count={count} />);
    else nav.pop();
  });
  on("benchPing", () => Date.now());

  return (
    <ScrollView layout={{ direction: "vertical" }}>
      <View padding={{ horizontal: 16, top: 48, bottom: 12 }}>
        <Text fontSize={28} fontWeight={700}>
          solid-fuse demos
        </Text>
        <Text color="#6B7280" fontSize={14}>
          Playground for widget primitives
        </Text>
      </View>
      <MenuItem
        label="counter"
        onTap={() => nav.push(() => <CounterScreen />)}
      />
      <MenuItem
        label="textField"
        onTap={() => nav.push(() => <TextFieldScreen />)}
      />
      <MenuItem
        label="icon"
        onTap={() => nav.push(() => <IconScreen />)}
      />
      <MenuItem
        label="list"
        onTap={() => nav.push(() => <ListScreen />)}
      />
      <MenuItem
        label="builder"
        onTap={() => nav.push(() => <BuilderScreen />)}
      />
      <MenuItem
        label="scrollController"
        onTap={() => nav.push(() => <ScrollScreen />)}
      />
      <MenuItem label="core widgets" onTap={() => nav.push(() => <CoreScreen />)} />
      <MenuItem label="material" onTap={() => nav.push(() => <MaterialScreen />)} />
      <MenuItem label="cupertino" onTap={() => nav.push(() => <CupertinoScreen />)} />
      <MenuItem label="adaptive" onTap={() => nav.push(() => <AdaptiveScreen />)} />
      <MenuItem label="animation frames" onTap={() => nav.push(() => <FramesScreen />)} />
      <MenuItem label="springs" onTap={() => nav.push(() => <SpringsScreen />)} />
    </ScrollView>
  );
}
