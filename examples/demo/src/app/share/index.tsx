import { Text, View, useNavigation } from "solid-fuse";
import { routes } from "#fuse/routes";
import { Button } from "../../ui";

// The layout's first page: it shares the layout's path.
export default function ShareHome() {
  const nav = useNavigation();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={16} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text>Share home</Text>
      <Button onTap={() => nav.push(routes["/share/contact"])}>Pick contact</Button>
      <Button onTap={() => nav.pop()}>Close</Button>
    </View>
  );
}
