import { createSignal } from "solid-js";
import { Scaffold, AppBar, Column, Row, Container, Text, Icon, ImageNetwork, GestureDetector, ListView, Stack, Positioned, TextField, Expanded, Switch, Slider, ElevatedButton, For, Show } from "solid-fuse";
import { star } from "solid-fuse/icons/material";
export function Smoke() {
  const [n, setN] = createSignal(0);
  return (
    <Scaffold appBar={<AppBar title={<Text>T</Text>} />}>
      <ListView padding={16}>
        <Container padding={{ $: "symmetric", horizontal: 12, vertical: 4 }}
          decoration={{ $: "BoxDecoration", color: "white", borderRadius: 12, boxShadow: [{ blurRadius: 8, color: "#0002", offset: { dx: 0, dy: 2 } }] }}>
          <Row mainAxisAlignment="spaceBetween" crossAxisAlignment="center">
            <Expanded><Text style={{ fontSize: 18, fontWeight: "bold" }} maxLines={2} overflow="ellipsis">Hello {n()}</Text></Expanded>
            <Icon icon={star} size={20} color="amber" />
          </Row>
        </Container>
        <Stack><ImageNetwork src="https://x/y.png" width={40} height={40} /><Positioned left={0} top={0}><Text>x</Text></Positioned></Stack>
        <GestureDetector onTap={() => setN((v) => v + 1)} onPanUpdate={(e) => setN(e.delta.dx)}><Column /></GestureDetector>
        <TextField decoration={{ hintText: "a" }} onChanged={(t) => void t} />
        <Switch value={n() > 0} onChanged={(v) => void v} />
        <Slider value={0.5} onChanged={(v) => setN(v)} />
        <ElevatedButton onPressed={n() > 1 ? () => {} : null}><Text>Go</Text></ElevatedButton>
        <For each={[1, 2]}>{(i) => <Text>{i}</Text>}</For>
        <Show when={n() > 1}><Text>big</Text></Show>
        {/* @ts-expect-error */}
        <Container flexx={1} />
      </ListView>
    </Scaffold>
  );
}
