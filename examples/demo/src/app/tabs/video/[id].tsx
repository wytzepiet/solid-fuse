import { Text, View, useNav } from "solid-fuse";
import { Button } from "../../../ui";

// Under no tab's first page: it opens on the tab in front.
export default function Video(props: { id: string }) {
  const nav = useNav();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>{`Video ${props.id}`}</Text>
      <Button onTap={() => nav.push(`/tabs/post/${props.id}`)}>Post about it</Button>
      <Button onTap={() => nav.push(`/tabs/video/${Number(props.id) + 1}`)}>Next video</Button>
      <Button onTap={() => nav.pop()}>Back</Button>
    </View>
  );
}
