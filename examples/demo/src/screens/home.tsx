import { materialPage, Text, View, useNavigation } from "solid-fuse";
import { MenuItem } from "../ui";
import { CounterScreen } from "./counter";
import { TextFieldScreen } from "./text-field";
import { IconScreen } from "./icon";
import { ScrollScreen } from "./scroll";

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
        onTap={() => nav.push(materialPage({ child: () => <CounterScreen /> }))}
      />
      <MenuItem
        label="textField"
        onTap={() =>
          nav.push(materialPage({ child: () => <TextFieldScreen /> }))
        }
      />
      <MenuItem
        label="icon"
        onTap={() => nav.push(materialPage({ child: () => <IconScreen /> }))}
      />
      <MenuItem
        label="scrollController"
        onTap={() =>
          nav.push(materialPage({ child: () => <ScrollScreen /> }))
        }
      />
    </View>
  );
}
