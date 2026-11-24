import { createSignal } from "solid-js";
import { ScrollView, Text, View, useNav } from "solid-fuse";
import { createFocusNode } from "#fuse/flutter";
import { Icons, TextField } from "@solid-fuse/material";
import { Button, Row } from "../ui";

export function TextFieldScreen() {
  const nav = useNav();

  const [name, setName] = createSignal("");
  const [digits, setDigits] = createSignal("");
  const focus = createFocusNode();

  return (
    <ScrollView layout={{ direction: "vertical", gap: 16 }}>
        <View padding={{ horizontal: 16, top: 16, bottom: 8 }}>
          <Text fontSize={24} fontWeight={700}>
            textField
          </Text>
          <Text color="#6B7280" fontSize={14}>
            Reactive value, focus control, filtering
          </Text>
        </View>

        <View padding={{ horizontal: 16 }} layout={{ direction: "vertical", gap: 24 }}>
          {/* Basic reactive value */}
          <View layout={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight={600}>Name</Text>
            <TextField
              value={name()}
              onChange={setName}
              label="Name"
              placeholder="Your name"
            />
            <Text color="#6B7280" fontSize={13}>
              value = "{name()}"
            </Text>
            <Row>
              <Button onTap={() => setName("Override!")}>external setName</Button>
              <Button onTap={() => setName("")}>clear</Button>
            </Row>
          </View>

          {/* FocusNode demo */}
          <View layout={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight={600}>Focus control</Text>
            <TextField
              focusNode={focus}
              placeholder="Controlled by buttons below"
            />
            <Text color="#6B7280" fontSize={13}>
              hasFocus = {focus.hasFocus() ? "true" : "false"}
            </Text>
            <Row>
              <Button onTap={() => focus.requestFocus()}>focus</Button>
              <Button onTap={() => focus.unfocus()}>unfocus</Button>
            </Row>
          </View>

          {/* Filtering */}
          <View layout={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight={600}>Digits only</Text>
            <TextField
              value={digits()}
              onChange={setDigits}
              placeholder="Type letters, they vanish"
              keyboardType="number"
              allowPattern="[0-9]"
            />
          </View>

          {/* Slot widgets via JSX-as-prop */}
          <View layout={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight={600}>Slot widgets</Text>
            <TextField
              placeholder="Search…"
              prefixIcon={Icons.search}
            />
            <TextField
              placeholder="Password"
              obscureText
              prefixIcon={Icons.lock}
            />
          </View>

          {/* Autofocus */}
          <View layout={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight={600}>Autofocus</Text>
            <Text color="#6B7280" fontSize={13}>
              (would autofocus on mount — disabled here so it doesn't steal focus)
            </Text>
          </View>
        </View>

        <View padding={16}>
          <Button onTap={() => nav.pop()}>Back</Button>
        </View>
    </ScrollView>
  );
}
