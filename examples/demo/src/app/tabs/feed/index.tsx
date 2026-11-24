import { Text, View, useNavigation } from "solid-fuse";
import { routes } from "#fuse/routes";
import { Button } from "../../../ui";

export default function Feed() {
  const nav = useNavigation();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>Feed</Text>
      <Button onTap={() => nav.push(routes["/tabs/feed/post/[id]"], { id: "1" })}>Open post</Button>
      <Button onTap={() => nav.push(routes["/tabs/video/[id]"], { id: "7" })}>Open video</Button>
    </View>
  );
}
