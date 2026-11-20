import { GestureDetector, Show, Text, TextField, View } from "solid-fuse";
import { createMemo, createSignal } from "solid-js";

export function LoginForm(props: {
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const passwordOk = createMemo(() => password().length >= 8);
  const showHelper = createMemo(() => password().length > 0 && !passwordOk());
  const canSubmit = createMemo(() => email().includes("@") && passwordOk());

  const submit = () => {
    if (!canSubmit()) return;
    props.onSubmit(email(), password());
  };

  return (
    <View alignment="center" padding={24}>
      <View maxWidth={320} flex={{ direction: "vertical", gap: 16, align: "stretch" }}>
        <Text fontSize={28} fontWeight="bold" color="#1F2933">
          Sign in
        </Text>

        <TextField
          value={email()}
          keyboardType="email"
          autocorrect={false}
          textCapitalization="none"
          textInputAction="next"
          decoration={{ border: "outline", labelText: "Email" }}
          onChanged={(text) => setEmail(text)}
        />

        <View flex={{ direction: "vertical", gap: 6, align: "stretch" }}>
          <TextField
            value={password()}
            obscureText
            autocorrect={false}
            enableSuggestions={false}
            textInputAction="done"
            decoration={{ border: "outline", labelText: "Password" }}
            onChanged={(text) => setPassword(text)}
            onSubmitted={() => submit()}
          />
          <Show when={showHelper()}>
            <Text fontSize={12} color="red">
              At least 8 characters
            </Text>
          </Show>
        </View>

        <View opacity={canSubmit() ? 1 : 0.4} ignorePointer={!canSubmit()}>
          <GestureDetector onTap={() => submit()}>
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
