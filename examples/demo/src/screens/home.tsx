import { MaterialPage, Text, View, useNavigator } from "solid-fuse";
import { MenuItem } from "../ui";
import { TextFieldScreen } from "./text-field";
import { IconScreen } from "./icon";

export function HomeScreen() {
  const nav = useNavigator();

  return (
    <MaterialPage flex={{ direction: "vertical" }}>
      <View padding={{ horizontal: 16, top: 24, bottom: 12 }}>
        <Text fontSize={28} fontWeight="bold">
          solid-fuse demos
        </Text>
        <Text color="#6B7280" fontSize={14}>
          Playground for widget primitives
        </Text>
      </View>
      <MenuItem label="textField" onTap={() => nav.push(() => <TextFieldScreen />)} />
      <MenuItem label="icon" onTap={() => nav.push(() => <IconScreen />)} />
    </MaterialPage>
  );
}
