import { Text, View, useNav } from "solid-fuse";
import { Button } from "../../../ui";

export default function Post(props: { id: string }) {
  const nav = useNav();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>{`Post ${props.id}`}</Text>
      <Button onTap={() => nav.pop()}>Back</Button>
    </View>
  );
}
