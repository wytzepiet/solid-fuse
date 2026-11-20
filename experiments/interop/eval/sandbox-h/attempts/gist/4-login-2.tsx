import { View, Text, TextField, GestureDetector, Show } from "solid-fuse";
import { createSignal, createMemo } from "solid-js";

export function LoginForm(props: {
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const tooShort = createMemo(
    () => password().length > 0 && password().length < 8,
  );
  const valid = createMemo(
    () => email().includes("@") && password().length >= 8,
  );

  const submit = () => {
    if (valid()) props.onSubmit(email(), password());
  };

  return (
    <View
      grow={1}
      padding={16}
      flex={{ direction: "column", justify: "center", align: "center" }}
    >
      <View
        maxWidth={320}
        flex={{ direction: "column", gap: 12, align: "stretch" }}
      >
        <Text fontSize={24} fontWeight="bold" color="#111827">
          Sign in
        </Text>

        <View flex={{ direction: "column", gap: 4, align: "stretch" }}>
          <Text fontSize={13} color="#374151">
            Email
          </Text>
          <TextField
            keyboardType="emailAddress"
            onChanged={(v: string) => setEmail(v)}
          />
        </View>

        <View flex={{ direction: "column", gap: 4, align: "stretch" }}>
          <Text fontSize={13} color="#374151">
            Password
          </Text>
          <TextField
            obscureText={true}
            onChanged={(v: string) => setPassword(v)}
          />
          <Show when={tooShort()}>
            <Text fontSize={12} color="#dc2626">
              At least 8 characters
            </Text>
          </Show>
        </View>

        {/* Disabled state is shown by dimmed colours; the tap handler ignores taps while invalid. */}
        <GestureDetector onTap={submit}>
          <View
            padding={{ horizontal: 16, vertical: 12 }}
            flex={{ direction: "row", justify: "center", align: "center" }}
            decoration={{
              color: valid() ? "#2563eb" : "#bfdbfe",
              borderRadius: 8,
            }}
          >
            <Text fontSize={16} fontWeight="bold" color="#ffffff">
              Continue
            </Text>
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}
