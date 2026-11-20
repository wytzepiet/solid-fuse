import { createSignal } from "solid-js";
import {
  Column,
  Container,
  Divider,
  Expanded,
  ListView,
  Padding,
  Row,
  SafeArea,
  Scaffold,
  SizedBox,
  Slider,
  Switch,
  Text,
} from "solid-fuse";

function GroupHeading(props: { title: string }) {
  return (
    <Padding padding={{ $: "only", left: 16, right: 16, top: 24, bottom: 8 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "w600",
          color: "#8a8a8e",
          letterSpacing: 0.8,
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
          <Text style={{ fontSize: 16, color: "#1c1c1e" }}>{props.label}</Text>
        </Expanded>
        <Switch value={props.value} onChanged={(v) => props.onChanged(v)} />
      </Row>
    </Padding>
  );
}

function RowDivider() {
  return <Divider height={1} thickness={1} indent={16} color="#e5e5ea" />;
}

export function SettingsScreen() {
  const [push, setPush] = createSignal(true);
  const [email, setEmail] = createSignal(false);
  const [sounds, setSounds] = createSignal(true);
  const [textSize, setTextSize] = createSignal(16);
  const [darkMode, setDarkMode] = createSignal(false);

  return (
    <Scaffold
      backgroundColor="#f2f2f7"
      body={
        <SafeArea>
          <ListView padding={16}>
            <Padding padding={{ $: "only", left: 16, top: 8 }}>
              <Text
                style={{ fontSize: 32, fontWeight: "bold", color: "#1c1c1e" }}
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
              <Column mainAxisSize="min" crossAxisAlignment="stretch">
                <ToggleRow
                  label="Push notifications"
                  value={push()}
                  onChanged={(v) => setPush(v)}
                />
                <RowDivider />
                <ToggleRow
                  label="Email digest"
                  value={email()}
                  onChanged={(v) => setEmail(v)}
                />
                <RowDivider />
                <ToggleRow
                  label="Sounds"
                  value={sounds()}
                  onChanged={(v) => setSounds(v)}
                />
              </Column>
            </Container>

            <GroupHeading title="Display" />
            <Container
              decoration={{
                $: "BoxDecoration",
                color: "white",
                borderRadius: 12,
              }}
            >
              <Column mainAxisSize="min" crossAxisAlignment="stretch">
                <Padding
                  padding={{ $: "only", left: 16, right: 16, top: 14 }}
                >
                  <Row crossAxisAlignment="center">
                    <Expanded>
                      <Text style={{ fontSize: 16, color: "#1c1c1e" }}>
                        Text size
                      </Text>
                    </Expanded>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "w600",
                        color: "#8a8a8e",
                      }}
                    >
                      {`${Math.round(textSize())}`}
                    </Text>
                  </Row>
                </Padding>
                <Padding padding={{ $: "symmetric", horizontal: 4 }}>
                  <Slider
                    value={textSize()}
                    min={12}
                    max={24}
                    divisions={12}
                    onChanged={(v) => setTextSize(v)}
                  />
                </Padding>
                <RowDivider />
                <ToggleRow
                  label="Dark mode"
                  value={darkMode()}
                  onChanged={(v) => setDarkMode(v)}
                />
              </Column>
            </Container>
            <SizedBox height={24} />
          </ListView>
        </SafeArea>
      }
    />
  );
}
