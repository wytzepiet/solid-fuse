import { Text, View, useNav } from "solid-fuse";
import { Button } from "../../ui";

export default function Contact() {
  const nav = useNav();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={16} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text>Contact picker</Text>
      <Button onTap={() => nav.pop()}>Back</Button>
    </View>
  );
}
