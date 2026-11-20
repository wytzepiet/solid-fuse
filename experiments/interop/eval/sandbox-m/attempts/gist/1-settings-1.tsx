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
  SizedBox,
  Slider,
  Switch,
  Text,
} from "solid-fuse";
import { createSignal } from "solid-js";

function GroupHeading(props: { title: string }) {
  return (
    <Padding padding={{ $: "only", left: 16, bottom: 8 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "w600",
          letterSpacing: 0.8,
          color: "#8E8E93",
        }}
      >
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
    <Padding padding={{ $: "symmetric", horizontal: 16, vertical: 6 }}>
      <Row crossAxisAlignment="center">
        <Expanded>
          <Text style={{ fontSize: 16, color: "#1C1C1E" }}>{props.label}</Text>
        </Expanded>
        <Switch
          value={props.value}
          onChanged={(value: boolean) => props.onChanged(value)}
        />
      </Row>
    </Padding>
  );
}

function RowDivider() {
  return <Divider height={1} thickness={1} indent={16} color="#E5E5EA" />;
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
                <Text
                  style={{ fontSize: 32, fontWeight: "bold", color: "#1C1C1E" }}
                >
                  Settings
                </Text>
              </Padding>

              <GroupHeading title="Notifications" />
              <Container
                decoration={{
                  $: "BoxDecoration",
                  color: "white",
                  borderRadius: 12,
                }}
              >
                <Column crossAxisAlignment="stretch">
                  <ToggleRow
                    label="Push notifications"
                    value={push()}
                    onChanged={(value) => setPush(value)}
                  />
                  <RowDivider />
                  <ToggleRow
                    label="Email digest"
                    value={email()}
                    onChanged={(value) => setEmail(value)}
                  />
                  <RowDivider />
                  <ToggleRow
                    label="Sounds"
                    value={sounds()}
                    onChanged={(value) => setSounds(value)}
                  />
                </Column>
              </Container>

              <SizedBox height={28} />

              <GroupHeading title="Display" />
              <Container
                decoration={{
                  $: "BoxDecoration",
                  color: "white",
                  borderRadius: 12,
                }}
              >
                <Column crossAxisAlignment="stretch">
                  <Padding
                    padding={{ $: "only", left: 16, right: 16, top: 14 }}
                  >
                    <Row crossAxisAlignment="center">
                      <Expanded>
                        <Text style={{ fontSize: 16, color: "#1C1C1E" }}>
                          Text size
                        </Text>
                      </Expanded>
                      <Text style={{ fontSize: 16, color: "#8E8E93" }}>
                        {String(Math.round(textSize()))}
                      </Text>
                    </Row>
                  </Padding>
                  <Padding padding={{ $: "symmetric", horizontal: 4 }}>
                    <Slider
                      value={textSize()}
                      min={12}
                      max={24}
                      onChanged={(value: number) => setTextSize(value)}
                    />
                  </Padding>
                  <RowDivider />
                  <ToggleRow
                    label="Dark mode"
                    value={darkMode()}
                    onChanged={(value) => setDarkMode(value)}
                  />
                </Column>
              </Container>
            </Column>
          </SingleChildScrollView>
        </SafeArea>
      }
    />
  );
}
