import { useNavigator } from "solid-fuse";
import { MenuItem } from "../ui";
import { TextFieldScreen } from "./text-field";
import { IconScreen } from "./icon";

export function HomeScreen() {
  const nav = useNavigator();

  return (
    <materialPage flex={{ direction: "vertical" }}>
      <view padding={{ horizontal: 16, top: 24, bottom: 12 }}>
        <text fontSize={28} fontWeight="bold">
          solid-fuse demos
        </text>
        <text color="#6B7280" fontSize={14}>
          Playground for widget primitives
        </text>
      </view>
      <MenuItem label="textField" onTap={() => nav.push(() => <TextFieldScreen />)} />
      <MenuItem label="icon" onTap={() => nav.push(() => <IconScreen />)} />
    </materialPage>
  );
}
