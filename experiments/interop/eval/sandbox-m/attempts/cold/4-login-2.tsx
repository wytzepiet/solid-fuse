import {
  Center,
  Column,
  ConstrainedBox,
  ElevatedButton,
  Material,
  Padding,
  Show,
  SizedBox,
  Text,
  TextField,
} from "solid-fuse";
import { createMemo, createSignal } from "solid-js";

export function LoginForm(props: {
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const passwordOk = createMemo(() => password().length >= 8);
  const tooShort = createMemo(() => password().length > 0 && !passwordOk());
  const valid = createMemo(() => email().includes("@") && passwordOk());

  const submit = () => {
    props.onSubmit(email(), password());
  };

  return (
    <Material type="transparency">
      <Center>
        <ConstrainedBox constraints={{ maxWidth: 320 }}>
          <Padding padding={16}>
            <Column mainAxisSize="min" crossAxisAlignment="stretch">
              <Text style={{ fontSize: 28, fontWeight: "bold" }}>Sign in</Text>
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
              <Show when={tooShort()}>
                <Padding padding={{ $: "only", top: 6, left: 12 }}>
                  <Text style={{ fontSize: 12, color: "red" }}>
                    At least 8 characters
                  </Text>
                </Padding>
              </Show>
              <SizedBox height={24} />
              {/* A null onPressed gives Material's dimmed, non-tappable disabled look. */}
              <SizedBox height={48}>
                <ElevatedButton onPressed={valid() ? submit : null}>
                  <Text>Continue</Text>
                </ElevatedButton>
              </SizedBox>
            </Column>
          </Padding>
        </ConstrainedBox>
      </Center>
    </Material>
  );
}
