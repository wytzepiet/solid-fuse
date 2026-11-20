import { View, Text, TextField, GestureDetector, Show } from "solid-fuse";
import { createSignal, createMemo } from "solid-js";

export function LoginForm(props: {
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const passwordOk = createMemo(() => password().length >= 8);
  const tooShort = createMemo(() => password().length > 0 && !passwordOk());
  const canSubmit = createMemo(() => email().includes("@") && passwordOk());

  const submit = () => {
    if (canSubmit()) props.onSubmit(email(), password());
  };

  return (
    <View alignment="center" padding={24}>
      <View maxWidth={320} flex={{ direction: "vertical", gap: 16, align: "stretch" }}>
        <Text fontSize={28} fontWeight="bold" color="#222222">
          Sign in
        </Text>
        <TextField
          value={email()}
          keyboardType="email"
          onChanged={(text: string) => setEmail(text)}
          decoration={{ border: "outline", labelText: "Email" }}
        />
        <View flex={{ direction: "vertical", gap: 4, align: "stretch" }}>
          <TextField
            value={password()}
            obscureText
            onChanged={(text: string) => setPassword(text)}
            decoration={{ border: "outline", labelText: "Password" }}
          />
          <Show when={tooShort()}>
            <Text fontSize={12} color="red">
              At least 8 characters
            </Text>
          </Show>
        </View>
        <View opacity={canSubmit() ? 1 : 0.4} ignorePointer={!canSubmit()}>
          <GestureDetector onTap={submit}>
            <View
              height={48}
              alignment="center"
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
