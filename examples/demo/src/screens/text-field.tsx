import { createSignal } from "solid-js";
import {
  Icon,
  MaterialPage,
  ScrollView,
  Text,
  TextField,
  View,
  createFocusNode,
  useNavigator,
} from "solid-fuse";
import { search, lock } from "solid-fuse/icons/material";
import { Button, Row } from "../ui";

export function TextFieldScreen() {
  const nav = useNavigator();

  const [name, setName] = createSignal("");
  const [digits, setDigits] = createSignal("");
  const focus = createFocusNode();

  return (
    <MaterialPage>
      <ScrollView flex={{ direction: "vertical", gap: 16 }}>
        <View padding={{ horizontal: 16, top: 16, bottom: 8 }}>
          <Text fontSize={24} fontWeight="bold">
            textField
          </Text>
          <Text color="#6B7280" fontSize={14}>
            Reactive value, focus control, filtering
          </Text>
        </View>

        <View padding={{ horizontal: 16 }} flex={{ direction: "vertical", gap: 24 }}>
          {/* Basic reactive value */}
          <View flex={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight="semiBold">Name</Text>
            <TextField
              value={name()}
              onChanged={setName}
              placeholder="Your name"
              decoration={{ border: "outline", contentPadding: 12 }}
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
          <View flex={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight="semiBold">Focus control</Text>
            <TextField
              focusNode={focus}
              placeholder="Controlled by buttons below"
              decoration={{ border: "outline", contentPadding: 12 }}
            />
            <Text color="#6B7280" fontSize={13}>
              hasFocus = {focus.hasFocus() ? "true" : "false"}
            </Text>
            <Row>
              <Button onTap={() => focus.focus()}>focus</Button>
              <Button onTap={() => focus.unfocus()}>unfocus</Button>
            </Row>
          </View>

          {/* Filtering */}
          <View flex={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight="semiBold">Digits only</Text>
            <TextField
              value={digits()}
              onChanged={setDigits}
              placeholder="Type letters, they vanish"
              keyboardType="number"
              allowPattern="[0-9]"
              decoration={{ border: "outline", contentPadding: 12 }}
            />
          </View>

          {/* Slot widgets via JSX-as-prop */}
          <View flex={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight="semiBold">Slot widgets</Text>
            <TextField
              placeholder="Search…"
              prefixIcon={<Icon data={search} size={20} color="#6B7280" />}
              decoration={{ border: "outline", contentPadding: 12 }}
            />
            <TextField
              placeholder="Password"
              obscureText
              prefixIcon={<Icon data={lock} size={20} color="#6B7280" />}
              decoration={{ border: "outline", contentPadding: 12 }}
            />
          </View>

          {/* Autofocus */}
          <View flex={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight="semiBold">Autofocus</Text>
            <Text color="#6B7280" fontSize={13}>
              (would autofocus on mount — disabled here so it doesn't steal focus)
            </Text>
          </View>
        </View>

        <View padding={16}>
          <Button onTap={() => nav.pop()}>Back</Button>
        </View>
      </ScrollView>
    </MaterialPage>
  );
}
