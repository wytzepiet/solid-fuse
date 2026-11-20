import { createSignal } from "solid-js";
import { View, Text, Icon, Image, GestureDetector, ScrollView, Stack, Positioned, TextField, For, Show } from "solid-fuse";
import { star } from "solid-fuse/icons/material";
export function Smoke() {
  const [n, setN] = createSignal(0);
  return (
    <ScrollView padding={16} flex={{ gap: 8 }}>
      <View flex={{ direction: "horizontal", justify: "spaceBetween", align: "center" }} padding={{ horizontal: 12, vertical: 4 }}
        decoration={{ color: "white", borderRadius: 12, shadow: [{ blurRadius: 8, color: "#0002", offsetY: 2 }] }}>
        <Text fontSize={18} fontWeight="bold" maxLines={2} overflow="ellipsis">Hello {n()}</Text>
        <Icon data={star} size={20} color="amber" />
      </View>
      <Stack><Image src="https://x/y.png" width={40} height={40} /><Positioned left={0} top={0}><Text>x</Text></Positioned></Stack>
      <GestureDetector onTap={() => setN((v) => v + 1)} onPanUpdate={(e) => setN(e.dx)}><View grow={1} /></GestureDetector>
      <TextField placeholder="a" onChanged={(t) => void t} />
      <For each={[1, 2]}>{(i) => <Text>{i}</Text>}</For>
      <Show when={n() > 1}><Text>big</Text></Show>
      {/* @ts-expect-error */}
      <View flexx={1} />
    </ScrollView>
  );
}
