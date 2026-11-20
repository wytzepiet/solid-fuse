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
import type { FuseChildren, FuseElement } from "solid-fuse";
import { createSignal } from "solid-js";

function Group(props: { title: string; children: FuseChildren }): FuseElement {
  return (
    <Column crossAxisAlignment="stretch">
      <Padding padding={{ $: "only", left: 16, bottom: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: "w600", color: "#8A8A8E", letterSpacing: 0.8 }}>
          {props.title.toUpperCase()}
        </Text>
      </Padding>
      <Container
        clipBehavior="antiAlias"
        decoration={{
          $: "BoxDecoration",
          color: "white",
          borderRadius: 12,
          boxShadow: [{ color: "#00000014", blurRadius: 6, offset: { dx: 0, dy: 1 } }],
        }}
      >
        <Column crossAxisAlignment="stretch">{props.children}</Column>
      </Container>
    </Column>
  );
}

function ToggleRow(props: {
  label: string;
  value: boolean;
  onChanged: (value: boolean) => void;
}): FuseElement {
  return (
    <Padding padding={{ $: "symmetric", horizontal: 16, vertical: 6 }}>
      <Row crossAxisAlignment="center">
        <Expanded>
          <Text style={{ fontSize: 16, color: "#1C1C1E" }}>{props.label}</Text>
        </Expanded>
        <Switch value={props.value} onChanged={(v) => props.onChanged(v)} />
      </Row>
    </Padding>
  );
}

function RowDivider(): FuseElement {
  return <Divider height={1} thickness={1} indent={16} color="#E5E5EA" />;
}

export function SettingsScreen(): FuseElement {
  const [push, setPush] = createSignal(true);
  const [email, setEmail] = createSignal(false);
  const [sounds, setSounds] = createSignal(true);
  const [textSize, setTextSize] = createSignal(16);
  const [dark, setDark] = createSignal(false);

  return (
    <Scaffold backgroundColor="#F2F2F7">
      <SafeArea>
        <SingleChildScrollView padding={{ $: "symmetric", horizontal: 16, vertical: 24 }}>
          <Column crossAxisAlignment="stretch">
            <Padding padding={{ $: "only", left: 4, bottom: 24 }}>
              <Text style={{ fontSize: 32, fontWeight: "bold", color: "#1C1C1E" }}>Settings</Text>
            </Padding>

            <Group title="Notifications">
              <ToggleRow label="Push notifications" value={push()} onChanged={(v) => setPush(v)} />
              <RowDivider />
              <ToggleRow label="Email digest" value={email()} onChanged={(v) => setEmail(v)} />
              <RowDivider />
              <ToggleRow label="Sounds" value={sounds()} onChanged={(v) => setSounds(v)} />
            </Group>

            <Container height={28} />

            <Group title="Display">
              <Padding padding={{ $: "only", left: 16, right: 16, top: 14 }}>
                <Row crossAxisAlignment="center">
                  <Expanded>
                    <Text style={{ fontSize: 16, color: "#1C1C1E" }}>Text size</Text>
                  </Expanded>
                  <Text style={{ fontSize: 16, fontWeight: "w600", color: "#8A8A8E" }}>
                    {Math.round(textSize())}
                  </Text>
                </Row>
              </Padding>
              <Padding padding={{ $: "only", left: 4, right: 4, bottom: 4 }}>
                <Slider
                  value={textSize()}
                  min={12}
                  max={24}
                  divisions={12}
                  onChanged={(v) => setTextSize(v)}
                />
              </Padding>
              <RowDivider />
              <ToggleRow label="Dark mode" value={dark()} onChanged={(v) => setDark(v)} />
            </Group>
          </Column>
        </SingleChildScrollView>
      </SafeArea>
    </Scaffold>
  );
}
