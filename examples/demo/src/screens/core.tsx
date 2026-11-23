import { createSignal, For } from "solid-js";
import {
  Expandable, Menu, Modal, Pressable, RadioGroup, ScrollView, Text, TextInput, Tooltip, View,
  type PressState,
} from "solid-fuse";
import { Button, Row } from "../ui";

// Core's design-free widgets: behaviour only, the look is plain Views.
export function CoreScreen() {
  const [presses, setPresses] = createSignal(0);
  const [text, setText] = createSignal("");
  const [open, setOpen] = createSignal(false);
  const [menu, setMenu] = createSignal(false);
  const [fruit, setFruit] = createSignal("apple");
  const [size, setSize] = createSignal<"S" | "M" | "L">("M");

  return (
    <ScrollView flex={{ direction: "vertical", gap: 20 }} padding={16}>
      <Text fontSize={24} fontWeight="bold">core widgets</Text>

      <Section title="Pressable">
        <Pressable onPress={() => setPresses((n) => n + 1)} semanticLabel="Press me">
          {(state: () => PressState) => (
            <View
              padding={{ horizontal: 16, vertical: 12 }}
              decoration={{ color: state().pressed ? "#1e40af" : state().hovered ? "#1d4ed8" : "#2563eb", borderRadius: 8 }}
            >
              <Text color="white">{`Pressed ${presses()} times`}</Text>
            </View>
          )}
        </Pressable>
      </Section>

      <Section title="TextInput">
        <View padding={12} decoration={{ border: { width: 1, color: "#D1D5DB" }, borderRadius: 8 }}>
          <TextInput value={text()} onChange={setText} placeholder="Type here" />
        </View>
        <Text color="#6B7280">{`input = "${text()}"`}</Text>
        <Row>
          <Button onTap={() => setText("from JS")}>set from JS</Button>
        </Row>
      </Section>

      <Section title="Modal">
        <Row>
          <Button onTap={() => setOpen(true)}>open dialog</Button>
        </Row>
        <Modal open={open()} onOpenChange={setOpen}>
          <View padding={24} width={280} decoration={{ color: "white", borderRadius: 16 }} flex={{ gap: 16 }}>
            <Text fontSize={18} fontWeight="bold">Core dialog</Text>
            <Text>No design: the content brings its own surface.</Text>
            <Button onTap={() => setOpen(false)}>close</Button>
          </View>
        </Modal>
      </Section>

      <Section title="Menu">
        <Menu
          open={menu()}
          onOpenChange={setMenu}
          content={
            <View width={160} decoration={{ color: "white", borderRadius: 8, shadow: { blurRadius: 8, color: "#00000033" } }}>
              <For each={["apple", "banana", "cherry"]}>
                {(f) => (
                  <Pressable onPress={() => (setFruit(f), setMenu(false))}>
                    <View padding={12}><Text>{f}</Text></View>
                  </Pressable>
                )}
              </For>
            </View>
          }
        >
          <Button onTap={() => setMenu(!menu())}>{`fruit: ${fruit()}`}</Button>
        </Menu>
      </Section>

      <Section title="RadioGroup + Tooltip">
        <RadioGroup value={size()} onChange={setSize}>
          <Text>{`size = ${size()}`}</Text>
        </RadioGroup>
        <Tooltip
          content={<View padding={8} decoration={{ color: "#111827", borderRadius: 4 }}><Text color="white">A tooltip</Text></View>}
          trigger="tap"
        >
          <Text color="#2563eb">tap for a tooltip</Text>
        </Tooltip>
      </Section>

      <Section title="Expandable">
        <Expandable header={<View padding={12} decoration={{ color: "#F3F4F6" }}><Text>Show more</Text></View>}>
          <View padding={12}><Text>The body, animated in.</Text></View>
        </Expandable>
      </Section>
    </ScrollView>
  );
}

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <View flex={{ direction: "vertical", gap: 8 }}>
      <Text fontWeight="semiBold">{props.title}</Text>
      {props.children}
    </View>
  );
}
