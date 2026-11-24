import { Text, View, useNav } from "solid-fuse";
import { Button } from "../../../ui";

// Under the profile tab's first page: it opens on the profile tab, from anywhere.
export default function EditProfile() {
  const nav = useNav();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>Editing profile</Text>
      <Button onTap={() => nav.pop()}>Back</Button>
    </View>
  );
}
