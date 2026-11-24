import { Text, View, useNav } from "solid-fuse";
import { Button } from "../../ui";

// The first tab's first page: it shares /tabs with the tabs.
export default function Feed() {
  const nav = useNav();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>Feed</Text>
      <Button onTap={() => nav.push("/tabs/post/1")}>Open post</Button>
      <Button onTap={() => nav.push("/tabs/video/7")}>Open video</Button>
      <Button onTap={() => nav.push("/tabs/profile/edit")}>Edit profile</Button>
    </View>
  );
}
