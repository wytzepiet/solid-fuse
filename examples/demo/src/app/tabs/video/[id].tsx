import { Text, View, useNavigation } from "solid-fuse";
import { routes } from "#fuse/routes";
import { Button } from "../../../ui";

// In the tabs folder but no tab's: it opens in whichever tab pushes it.
export default function Video(props: { id: string }) {
  const nav = useNavigation();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>{`Video ${props.id}`}</Text>
      <Button onTap={() => nav.push(routes["/tabs/feed/post/[id]"], { id: props.id })}>Post about it</Button>
      <Button onTap={() => nav.pop()}>Back</Button>
    </View>
  );
}
