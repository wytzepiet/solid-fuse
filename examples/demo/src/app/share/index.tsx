import { Text, View, useNav } from "solid-fuse";
import { Button } from "../../ui";

// The sheet's first page: it shares /share with the sheet.
export default function ShareHome() {
  const nav = useNav();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={16} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text>Share home</Text>
      <Button onTap={() => nav.push("/share/contact")}>Pick contact</Button>
      <Button onTap={() => nav.pop()}>Close</Button>
    </View>
  );
}
