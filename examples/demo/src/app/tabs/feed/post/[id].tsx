import { Text, View, useNavigation } from "solid-fuse";
import { Button } from "../../../../ui";

// In the feed tab's folder: it opens in the feed tab.
export default function Post(props: { id: string }) {
  const nav = useNavigation();
  return (
    <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
      <Text fontSize={24} fontWeight={700}>{`Post ${props.id}`}</Text>
      <Button onTap={() => nav.pop()}>Back</Button>
    </View>
  );
}
