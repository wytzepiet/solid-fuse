import { createSignal } from "solid-js";
import { createFocusNode, useNavigator } from "solid-fuse";
import { search, lock } from "solid-fuse/icons/material";
import { Button, Row } from "../ui";

export function TextFieldScreen() {
  const nav = useNavigator();

  const [name, setName] = createSignal("");
  const [digits, setDigits] = createSignal("");
  const focus = createFocusNode();

  return (
    <materialPage>
      <scrollView flex={{ direction: "vertical", gap: 16 }}>
        <view padding={{ horizontal: 16, top: 16, bottom: 8 }}>
        <text fontSize={24} fontWeight="bold">
          textField
        </text>
        <text color="#6B7280" fontSize={14}>
          Reactive value, focus control, filtering
        </text>
      </view>

      <view padding={{ horizontal: 16 }} flex={{ direction: "vertical", gap: 24 }}>
        {/* Basic reactive value */}
        <view flex={{ direction: "vertical", gap: 6 }}>
          <text fontWeight="semiBold">Name</text>
          <textField
            value={name()}
            onChanged={setName}
            placeholder="Your name"
            decoration={{ border: "outline", contentPadding: 12 }}
          />
          <text color="#6B7280" fontSize={13}>
            value = "{name()}"
          </text>
          <Row>
            <Button onTap={() => setName("Override!")}>external setName</Button>
            <Button onTap={() => setName("")}>clear</Button>
          </Row>
        </view>

        {/* FocusNode demo */}
        <view flex={{ direction: "vertical", gap: 6 }}>
          <text fontWeight="semiBold">Focus control</text>
          <textField
            focusNode={focus}
            placeholder="Controlled by buttons below"
            decoration={{ border: "outline", contentPadding: 12 }}
          />
          <text color="#6B7280" fontSize={13}>
            hasFocus = {focus.hasFocus() ? "true" : "false"}
          </text>
          <Row>
            <Button onTap={() => focus.focus()}>focus</Button>
            <Button onTap={() => focus.unfocus()}>unfocus</Button>
          </Row>
        </view>

        {/* Filtering */}
        <view flex={{ direction: "vertical", gap: 6 }}>
          <text fontWeight="semiBold">Digits only</text>
          <textField
            value={digits()}
            onChanged={setDigits}
            placeholder="Type letters, they vanish"
            keyboardType="number"
            allowPattern="[0-9]"
            decoration={{ border: "outline", contentPadding: 12 }}
          />
        </view>

        {/* Slot widgets via JSX-as-prop */}
        <view flex={{ direction: "vertical", gap: 6 }}>
          <text fontWeight="semiBold">Slot widgets</text>
          <textField
            placeholder="Search…"
            prefixIcon={<icon data={search} size={20} color="#6B7280" />}
            decoration={{ border: "outline", contentPadding: 12 }}
          />
          <textField
            placeholder="Password"
            obscureText
            prefixIcon={<icon data={lock} size={20} color="#6B7280" />}
            decoration={{ border: "outline", contentPadding: 12 }}
          />
        </view>

        {/* Autofocus */}
        <view flex={{ direction: "vertical", gap: 6 }}>
          <text fontWeight="semiBold">Autofocus</text>
          <text color="#6B7280" fontSize={13}>
            (would autofocus on mount — disabled here so it doesn't steal focus)
          </text>
        </view>
      </view>

        <view padding={16}>
          <Button onTap={() => nav.pop()}>Back</Button>
        </view>
      </scrollView>
    </materialPage>
  );
}
