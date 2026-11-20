// One-liners whose README example translates directly.
import { Icon, Text, View } from "solid-fuse";
import { createSignal } from "solid-js";
import { Badge } from "~/_generated/badges";
import { AutoSizeText } from "~/_generated/auto_size_text";
import { Pinput } from "~/_generated/pinput";
import { Skeletonizer } from "~/_generated/skeletonizer";
import { MarkdownBody } from "~/_generated/flutter_markdown_plus";
import { AnimatedTextKit } from "~/_generated/animated_text_kit";

// badges: badges.Badge(badgeContent: Text('3'), child: Icon(Icons.settings))
export const Cart = () => (
  <Badge badgeContent={<Text>3</Text>}>
    <Icon data={{ codePoint: 0xe8b8, fontFamily: "MaterialIcons" }} />
  </Badge>
);
// auto_size_text: AutoSizeText('The text to display', style: TextStyle(fontSize: 20), maxLines: 2)
export const Fit = () => <AutoSizeText style={{ fontSize: 20 }} maxLines={2}>The text to display</AutoSizeText>;
// pinput: Pinput(onCompleted: (pin) => print(pin))
export const Pin = () => <Pinput onCompleted={(pin) => console.log(pin)} />;
// skeletonizer: Skeletonizer(enabled: _loading, child: ...)        (needs generator fix 2, see report)
export const Skel = () => {
  const [loading] = createSignal(true);
  return <Skeletonizer enabled={loading()}><View><Text>Item number 1 as title</Text></View></Skeletonizer>;
};
// flutter_markdown_plus: MarkdownBody(data: markdownSource)
export const Md = () => <MarkdownBody data={"# Hello\n*world*"} onTapLink={([, href]) => console.log(href)} />;
// animated_text_kit: AnimatedTextKit(animatedTexts: [TypewriterAnimatedText('Hello world!', speed: 100ms)], totalRepeatCount: 4)
export const Typing = () => (
  <AnimatedTextKit
    animatedTexts={[{ $: "TypewriterAnimatedText", text: "Hello world!", textStyle: { fontSize: 32, fontWeight: 700 }, speed: 100 }]}
    totalRepeatCount={4}
    pause={1000}
    displayFullTextOnTap
    stopPauseOnTap
  />
);
