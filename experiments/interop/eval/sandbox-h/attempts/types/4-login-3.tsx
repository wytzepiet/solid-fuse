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
    if (canSubmit()) props.onSubmit(email(), password());
  };

  return (
    <View alignment="center" padding={24}>
      <View maxWidth={320} flex={{ gap: 16, align: "stretch" }}>
        <Text fontSize={28} fontWeight="bold" color="#1F2937">
          Sign in
        </Text>

        <TextField
          value={email()}
          keyboardType="email"
          autocorrect={false}
          textCapitalization="none"
          textInputAction="next"
          onChanged={(text) => setEmail(text)}
          decoration={{ border: "outline", labelText: "Email" }}
        />

        <View flex={{ gap: 6, align: "stretch" }}>
          <TextField
            value={password()}
            obscureText
            autocorrect={false}
            enableSuggestions={false}
            textInputAction="done"
            onChanged={(text) => setPassword(text)}
            onSubmitted={submit}
            decoration={{ border: "outline", labelText: "Password" }}
          />
          <Show when={passwordTooShort()}>
            <Text fontSize={12} color="red">
              At least 8 characters
            </Text>
          </Show>
        </View>

        <View opacity={canSubmit() ? 1 : 0.4} ignorePointer={!canSubmit()}>
          <GestureDetector behavior="opaque" onTap={submit}>
            <View
              height={48}
              alignment="center"
              decoration={{ color: "#2563EB", borderRadius: 10 }}
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
