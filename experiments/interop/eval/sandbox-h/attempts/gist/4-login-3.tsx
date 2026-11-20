import { createMemo, createSignal } from "solid-js";
import { GestureDetector, Show, Text, TextField, View } from "solid-fuse";

export function LoginForm(props: {
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const passwordTooShort = createMemo(
    () => password().length > 0 && password().length < 8,
  );
  const valid = createMemo(
    () => email().includes("@") && password().length >= 8,
  );

  const submit = () => {
    // Disabled state: taps are ignored until the form is valid.
    if (!valid()) return;
    props.onSubmit(email(), password());
  };

  return (
    <View
      grow={1}
      padding={24}
      flex={{ direction: "column", justify: "center", align: "center" }}
    >
      <View maxWidth={320} flex={{ direction: "column", gap: 16, align: "stretch" }}>
        <Text fontSize={28} color="#111827">
          Sign in
        </Text>

        {/* Labels are rendered as Text above each field rather than as in-field decoration labels. */}
        <View flex={{ direction: "column", gap: 6, align: "stretch" }}>
          <Text fontSize={14} color="#374151">
            Email
          </Text>
          <TextField
            value={email()}
            keyboardType="emailAddress"
            onChanged={(value: string) => setEmail(value)}
          />
        </View>

        <View flex={{ direction: "column", gap: 6, align: "stretch" }}>
          <Text fontSize={14} color="#374151">
            Password
          </Text>
          <TextField
            value={password()}
            obscureText={true}
            onChanged={(value: string) => setPassword(value)}
          />
          <Show when={passwordTooShort()}>
            <Text fontSize={12} color="#dc2626">
              At least 8 characters
            </Text>
          </Show>
        </View>

        <GestureDetector onTap={submit}>
          <View
            padding={{ horizontal: 16, vertical: 14 }}
            flex={{ direction: "row", justify: "center", align: "center" }}
            decoration={{
              color: valid() ? "#2563eb" : "#bfd0f7",
              borderRadius: 8,
            }}
          >
            <Text fontSize={16} color={valid() ? "#ffffff" : "#eef2fb"}>
              Continue
            </Text>
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}
