import {
  Scaffold,
  SafeArea,
  SingleChildScrollView,
  Column,
  Row,
  Container,
  Padding,
  SizedBox,
  Expanded,
  Divider,
  Text,
  Switch,
  Slider,
} from "solid-fuse";
import { createSignal } from "solid-js";

function GroupHeading(props: { label: string }) {
  return (
    <Padding padding={{ $: "only", left: 16, bottom: 8 }}>
      <Text style={{ fontSize: 12, color: "grey", letterSpacing: 0.8 }}>
        {props.label.toUpperCase()}
      </Text>
    </Padding>
  );
}

function ToggleRow(props: { label: string }) {
  const [on, setOn] = createSignal(false);
  return (
    <Padding padding={{ $: "symmetric", horizontal: 16, vertical: 4 }}>
      <Row mainAxisAlignment="spaceBetween" crossAxisAlignment="center">
        <Expanded>
          <Text style={{ fontSize: 16, color: "black" }}>{props.label}</Text>
        </Expanded>
        <Switch value={on()} onChanged={(v: boolean) => setOn(v)} />
      </Row>
    </Padding>
  );
}

function TextSizeRow() {
  const [size, setSize] = createSignal(16);
  return (
    <Padding padding={{ $: "only", left: 16, right: 16, top: 12, bottom: 4 }}>
      <Column crossAxisAlignment="stretch">
        <Row mainAxisAlignment="spaceBetween" crossAxisAlignment="center">
          <Text style={{ fontSize: 16, color: "black" }}>Text size</Text>
          <Text style={{ fontSize: 16, color: "grey" }}>
            {String(Math.round(size()))}
          </Text>
        </Row>
        <Slider
          value={size()}
          min={12}
          max={24}
          onChanged={(v: number) => setSize(v)}
        />
      </Column>
    </Padding>
  );
}

export function SettingsScreen() {
  return (
    <Scaffold
      backgroundColor="#F2F2F7"
      body={
        <SafeArea>
          <SingleChildScrollView padding={16}>
            <Column crossAxisAlignment="stretch">
              <Text style={{ fontSize: 32, color: "black" }}>Settings</Text>
              <SizedBox height={24} />

              <GroupHeading label="Notifications" />
              <Container
                decoration={{
                  $: "BoxDecoration",
                  color: "white",
                  borderRadius: 12,
                }}
              >
                <Column crossAxisAlignment="stretch">
                  <ToggleRow label="Push notifications" />
                  <Divider height={1} />
                  <ToggleRow label="Email digest" />
                  <Divider height={1} />
                  <ToggleRow label="Sounds" />
                </Column>
              </Container>
              <SizedBox height={24} />

              <GroupHeading label="Display" />
              <Container
                decoration={{
                  $: "BoxDecoration",
                  color: "white",
                  borderRadius: 12,
                }}
              >
                <Column crossAxisAlignment="stretch">
                  <TextSizeRow />
                  <Divider height={1} />
                  <ToggleRow label="Dark mode" />
                </Column>
              </Container>
            </Column>
          </SingleChildScrollView>
        </SafeArea>
      }
    />
  );
}
