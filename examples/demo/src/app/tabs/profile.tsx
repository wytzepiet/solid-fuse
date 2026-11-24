import { Text, View, useNavigation } from "solid-fuse";
import { routes } from "#fuse/routes";
import { Button } from "../../ui";

export default function Profile() {
  const nav = useNavigation();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>Profile</Text>
      <Button onTap={() => nav.push(routes["/tabs/video/[id]"], { id: "8" })}>Open video</Button>
      <Button onTap={() => nav.push(routes["/settings"])}>Settings</Button>
    </View>
  );
}
