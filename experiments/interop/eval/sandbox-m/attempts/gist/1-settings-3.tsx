import {
  Column,
  Container,
  Expanded,
  Padding,
  Row,
  SafeArea,
  Scaffold,
  SingleChildScrollView,
  SizedBox,
  Slider,
  Switch,
  Text,
} from "solid-fuse";
import { createSignal } from "solid-js";

function GroupHeading(props: { title: string }) {
  return (
    <Padding padding={{ $: "only", left: 12, bottom: 8 }}>
      <Text style={{ fontSize: 12, color: "#8E8E93", letterSpacing: 0.8 }}>
        {props.title.toUpperCase()}
      </Text>
    </Padding>
  );
}

function ToggleRow(props: {
  label: string;
  value: boolean;
  onChanged: (value: boolean) => void;
}) {
  return (
    <Padding padding={{ $: "symmetric", horizontal: 16, vertical: 4 }}>
      <Row crossAxisAlignment="center">
        <Expanded>
          <Text style={{ fontSize: 16, color: "#1C1C1E" }}>{props.label}</Text>
        </Expanded>
        <Switch value={props.value} onChanged={(v: boolean) => props.onChanged(v)} />
      </Row>
    </Padding>
  );
}

export function SettingsScreen() {
  const [push, setPush] = createSignal(true);
  const [email, setEmail] = createSignal(false);
  const [sounds, setSounds] = createSignal(true);
  const [textSize, setTextSize] = createSignal(16);
  const [darkMode, setDarkMode] = createSignal(false);

  return (
    <Scaffold
      backgroundColor="#F2F2F7"
      body={
        <SafeArea>
          <SingleChildScrollView padding={16}>
            <Column crossAxisAlignment="stretch">
              <Padding padding={{ $: "only", left: 4, top: 8, bottom: 24 }}>
                <Text style={{ fontSize: 32, color: "#1C1C1E" }}>Settings</Text>
              </Padding>

              <GroupHeading title="Notifications" />
              <Container
                decoration={{ $: "BoxDecoration", color: "#FFFFFF", borderRadius: 12 }}
                padding={{ $: "symmetric", vertical: 4 }}
              >
                <Column crossAxisAlignment="stretch">
                  <ToggleRow label="Push notifications" value={push()} onChanged={setPush} />
                  <ToggleRow label="Email digest" value={email()} onChanged={setEmail} />
                  <ToggleRow label="Sounds" value={sounds()} onChanged={setSounds} />
                </Column>
              </Container>

              <SizedBox height={24} />

              <GroupHeading title="Display" />
              <Container
                decoration={{ $: "BoxDecoration", color: "#FFFFFF", borderRadius: 12 }}
                padding={{ $: "symmetric", vertical: 4 }}
              >
                <Column crossAxisAlignment="stretch">
                  <Padding padding={{ $: "only", left: 16, right: 16, top: 12 }}>
                    <Row crossAxisAlignment="center">
                      <Expanded>
                        <Text style={{ fontSize: 16, color: "#1C1C1E" }}>Text size</Text>
                      </Expanded>
                      <Text style={{ fontSize: 16, color: "#8E8E93" }}>
                        {String(Math.round(textSize()))}
                      </Text>
                    </Row>
                  </Padding>
                  <Slider
                    value={textSize()}
                    min={12}
                    max={24}
                    onChanged={(v: number) => setTextSize(v)}
                  />
                  <ToggleRow label="Dark mode" value={darkMode()} onChanged={setDarkMode} />
                </Column>
              </Container>
            </Column>
          </SingleChildScrollView>
        </SafeArea>
      }
    />
  );
}
