import { Text, View, useNav } from "solid-fuse";
import { Button } from "../../ui";
import { people } from "./_people";

// An address gives the id as a string; this makes it a number.
export const parse = (p: { id: string }) => ({ id: Number(p.id) });

export default function User(props: { id: number }) {
  const nav = useNav();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>{`User ${people[props.id]}`}</Text>
      <Button onTap={() => nav.push("/share")}>Share</Button>
      <Button onTap={() => nav.pop()}>Back</Button>
    </View>
  );
}
