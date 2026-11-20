import { GestureDetector, Show, Text, TextField, View } from "solid-fuse";
import { createMemo, createSignal } from "solid-js";

export function LoginForm(props: {
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const passwordTooShort = createMemo(
    () => password().length > 0 && password().length < 8,
  );
  const canSubmit = createMemo(
    () => email().includes("@") && password().length >= 8,
  );

  const submit = () => {
    if (!canSubmit()) return;
    props.onSubmit(email(), password());
  };

  return (
    <View alignment="center" padding={24}>
      <View maxWidth={320} flex={{ direction: "vertical", gap: 16 }}>
        <Text fontSize={28} fontWeight="bold" color="#212121">
          Sign in
        </Text>

        <TextField
          value={email()}
          keyboardType="email"
          onChanged={(text: string) => setEmail(text)}
          decoration={{ border: "outline", labelText: "Email" }}
        />

        <View flex={{ direction: "vertical", gap: 6 }}>
          <TextField
            value={password()}
            obscureText
            onChanged={(text: string) => setPassword(text)}
            decoration={{ border: "outline", labelText: "Password" }}
          />
          <Show when={passwordTooShort()}>
            <Text fontSize={12} color="red">
              At least 8 characters
            </Text>
          </Show>
        </View>

        <View ignorePointer={!canSubmit()} opacity={canSubmit() ? 1 : 0.4}>
          <GestureDetector onTap={submit}>
            {/* alignment="center" makes the button fill the available (max 320) width */}
            <View
              alignment="center"
              padding={{ vertical: 14 }}
              decoration={{ color: "#1976D2", borderRadius: 8 }}
            >
              <Text fontSize={16} fontWeight="semiBold" color="white">
                Continue
              </Text>
            </View>
          </GestureDetector>
        </View>
      </View>
    </View>
  );
}
