import { Text, View, useNav } from "solid-fuse";
import { Button } from "../../ui";

export default function Profile() {
  const nav = useNav();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>Profile</Text>
      <Button onTap={() => nav.push("/tabs/video/8")}>Open video</Button>
      <Button onTap={() => nav.push("/settings")}>Settings</Button>
    </View>
  );
}
