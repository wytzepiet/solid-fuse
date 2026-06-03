import { Text, View, useNavigation } from "solid-fuse";
import { MenuItem } from "../ui";
import { CounterScreen } from "./counter";
import { TextFieldScreen } from "./text-field";
import { IconScreen } from "./icon";
import { ScrollScreen } from "./scroll";
import { SliverScreen } from "./sliver";

export function HomeScreen() {
  const nav = useNavigation();

  return (
    <View flex={{ direction: "vertical" }}>
      <View padding={{ horizontal: 16, top: 24, bottom: 12 }}>
        <Text fontSize={28} fontWeight="bold">
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
        label="scrollController"
        onTap={() => nav.push(() => <ScrollScreen />)}
      />
      <MenuItem
        label="slivers"
        onTap={() => nav.push(() => <SliverScreen />)}
      />
    </View>
  );
}
