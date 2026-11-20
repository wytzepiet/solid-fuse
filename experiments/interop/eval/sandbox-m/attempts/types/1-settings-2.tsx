import {
  Column,
  Container,
  Divider,
  Expanded,
  Padding,
  Row,
  SafeArea,
  Scaffold,
  SingleChildScrollView,
  Slider,
  Switch,
  Text,
} from "solid-fuse";
import type { FuseChildren } from "solid-fuse";
import { createSignal } from "solid-js";

function Group(props: { title: string; children: FuseChildren }) {
  return (
    <Column crossAxisAlignment="stretch">
      <Padding padding={{ $: "only", left: 12, bottom: 8 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "w600",
            letterSpacing: 1,
            color: "#8A8A8E",
          }}
        >
          {props.title.toUpperCase()}
        </Text>
      </Padding>
      <Container
        clipBehavior="antiAlias"
        decoration={{
          $: "BoxDecoration",
          color: "white",
          borderRadius: 12,
          boxShadow: [
            { color: "#00000014", blurRadius: 6, offset: { dx: 0, dy: 1 } },
          ],
        }}
      >
        <Column crossAxisAlignment="stretch">{props.children}</Column>
      </Container>
    </Column>
  );
}

function RowDivider() {
  return <Divider height={1} thickness={1} indent={16} color="#E5E5EA" />;
}

function ToggleRow(props: { label: string; initial: boolean }) {
  const [on, setOn] = createSignal(props.initial);
  return (
    <Padding padding={{ $: "symmetric", horizontal: 16, vertical: 6 }}>
      <Row crossAxisAlignment="center">
        <Expanded>
          <Text style={{ fontSize: 16, color: "#1C1C1E" }}>{props.label}</Text>
        </Expanded>
        <Switch value={on()} onChanged={(v) => setOn(v)} />
      </Row>
    </Padding>
  );
}

function TextSizeRow() {
  const [size, setSize] = createSignal(16);
  return (
    <Padding padding={{ $: "only", top: 14, bottom: 4 }}>
      <Column crossAxisAlignment="stretch">
        <Padding padding={{ $: "symmetric", horizontal: 16 }}>
          <Row crossAxisAlignment="center">
            <Expanded>
              <Text style={{ fontSize: 16, color: "#1C1C1E" }}>Text size</Text>
            </Expanded>
            <Text style={{ fontSize: 16, fontWeight: "w600", color: "#6B6B70" }}>
              {String(Math.round(size()))}
            </Text>
          </Row>
        </Padding>
        <Slider
          value={size()}
          min={12}
          max={24}
          divisions={12}
          onChanged={(v) => setSize(v)}
        />
      </Column>
    </Padding>
  );
}

export function SettingsScreen() {
  return (
    <Scaffold backgroundColor="#F2F2F7">
      <SafeArea>
        <SingleChildScrollView padding={16}>
          <Column crossAxisAlignment="stretch">
            <Padding padding={{ $: "only", left: 4, top: 8, bottom: 24 }}>
              <Text
                style={{ fontSize: 32, fontWeight: "bold", color: "#1C1C1E" }}
              >
                Settings
              </Text>
            </Padding>
            <Group title="Notifications">
              <ToggleRow label="Push notifications" initial={true} />
              <RowDivider />
              <ToggleRow label="Email digest" initial={false} />
              <RowDivider />
              <ToggleRow label="Sounds" initial={true} />
            </Group>
            <Container height={28} />
            <Group title="Display">
              <TextSizeRow />
              <RowDivider />
              <ToggleRow label="Dark mode" initial={false} />
            </Group>
          </Column>
        </SingleChildScrollView>
      </SafeArea>
    </Scaffold>
  );
}
