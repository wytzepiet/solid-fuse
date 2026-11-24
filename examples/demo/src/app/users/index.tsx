import { For } from "solid-js";
import { Text, View, useNavigation } from "solid-fuse";
import { routes } from "#fuse/routes";
import { Button, MenuItem } from "../../ui";
import { people } from "./_people";

// File routes: each file in src/app is a route. `nav.go("/users/2")` or the
// OS opening that link builds this page under the user's.
export default function Users() {
  const nav = useNavigation();
  return (
    <View layout={{ direction: "vertical" }} padding={{ top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <View padding={16}>
        <Text fontSize={24} fontWeight={700}>
          People
        </Text>
      </View>
      <For each={people}>{(name, i) => <MenuItem label={name} onTap={() => nav.push(routes["/users/[id]"], { id: i() })} />}</For>
      <View padding={16}>
        <Button onTap={() => nav.go("/share/contact")}>Open /share/contact</Button>
      </View>
    </View>
  );
}
