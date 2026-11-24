import { Text, View, page as pageOf, type PageType } from "solid-fuse";
import { FadeTransition, ScaleTransition } from "#fuse/flutter";

// A layout: the routes in this folder push inside it, under the banner,
// which stays put. It comes in with a transition written in JS.
export const page: PageType = (child) =>
  pageOf({
    child,
    transition: (content, { animation }) => (
      <FadeTransition opacity={animation}>
        <ScaleTransition scale={animation}>{content}</ScaleTransition>
      </FadeTransition>
    ),
  });

export default function Share(props: { children?: JSX.Element }) {
  return (
    <View layout={{ direction: "vertical" }} decoration={{ color: "#EEF2FF" }} width={Infinity} height={Infinity}>
      <View padding={{ horizontal: 16, top: 48, bottom: 12 }}>
        <Text fontSize={20} fontWeight={700}>Share flow</Text>
      </View>
      <View flex={1}>{props.children}</View>
    </View>
  );
}
