import { Text, View, useNav } from "solid-fuse";
import { Button } from "../ui";

// Nothing holds it: it opens on the app's own stack, over the tabs and their bar.
export default function Settings() {
  const nav = useNav();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>Settings</Text>
      <Button onTap={() => nav.pop()}>Done</Button>
    </View>
  );
}
