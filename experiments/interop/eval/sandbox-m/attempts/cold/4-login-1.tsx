import { createMemo, createSignal } from "solid-js";
import {
  Center,
  Column,
  ConstrainedBox,
  ElevatedButton,
  Padding,
  Scaffold,
  Show,
  SizedBox,
  Text,
  TextField,
} from "solid-fuse";

export function LoginForm(props: {
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const passwordOk = createMemo(() => password().length >= 8);
  const valid = createMemo(() => email().includes("@") && passwordOk());
  const showHelper = createMemo(() => password().length > 0 && !passwordOk());

  return (
    <Scaffold
      body={
        <Center>
          <Padding padding={16}>
            <ConstrainedBox constraints={{ maxWidth: 320 }}>
              <Column mainAxisSize="min" crossAxisAlignment="stretch">
                <Text style={{ fontSize: 24, fontWeight: "bold" }}>Sign in</Text>
                <SizedBox height={24} />
                <TextField
                  keyboardType="emailAddress"
                  decoration={{
                    labelText: "Email",
                    border: { $: "OutlineInputBorder" },
                  }}
                  onChanged={(text) => setEmail(text)}
                />
                <SizedBox height={16} />
                <TextField
                  obscureText
                  decoration={{
                    labelText: "Password",
                    border: { $: "OutlineInputBorder" },
                  }}
                  onChanged={(text) => setPassword(text)}
                />
                <Show when={showHelper()}>
                  <Padding padding={{ $: "only", top: 4, left: 12 }}>
                    <Text style={{ fontSize: 12, color: "red" }}>
                      At least 8 characters
                    </Text>
                  </Padding>
                </Show>
                <SizedBox height={24} />
                {/* A null onPressed disables the button; Material dims it automatically. */}
                <ElevatedButton
                  onPressed={
                    valid() ? () => props.onSubmit(email(), password()) : null
                  }
                >
                  <Text>Continue</Text>
                </ElevatedButton>
              </Column>
            </ConstrainedBox>
          </Padding>
        </Center>
      }
    />
  );
}
