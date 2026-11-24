import { Text, View, useNavigation } from "solid-fuse";
import { routes } from "#fuse/routes";
import { Button } from "../../ui";
import { people } from "./_people";

// A link gives the id as a string; this makes it a number.
export const parse = { id: Number };

export default function User(props: { id: number }) {
  const nav = useNavigation();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>{`User ${people[props.id]}`}</Text>
      <Button onTap={() => nav.push(routes["/share/_layout"])}>Share</Button>
      <Button onTap={() => nav.pop()}>Back</Button>
    </View>
  );
}
