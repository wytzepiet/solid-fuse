import { createMemo, createSignal } from "solid-js";
import {
  Center,
  Column,
  ConstrainedBox,
  ElevatedButton,
  Padding,
  Scaffold,
  Show,
  SingleChildScrollView,
  Text,
  TextField,
} from "solid-fuse";

const MIN_PASSWORD_LENGTH = 8;

export function LoginForm(props: {
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const passwordTooShort = createMemo(
    () => password().length > 0 && password().length < MIN_PASSWORD_LENGTH,
  );
  const canSubmit = createMemo(
    () => email().includes("@") && password().length >= MIN_PASSWORD_LENGTH,
  );

  const submit = () => {
    props.onSubmit(email(), password());
  };

  return (
    <Scaffold>
      <Center>
        <SingleChildScrollView>
          <Padding padding={16}>
            <ConstrainedBox constraints={{ maxWidth: 320 }}>
              <Column mainAxisSize="min" crossAxisAlignment="stretch" spacing={16}>
                <Text style={{ fontSize: 28, fontWeight: "bold" }}>Sign in</Text>
                <TextField
                  keyboardType="emailAddress"
                  autocorrect={false}
                  decoration={{ labelText: "Email", border: { $: "OutlineInputBorder" } }}
                  onChanged={(text) => setEmail(text)}
                />
                <Column mainAxisSize="min" crossAxisAlignment="stretch">
                  <TextField
                    obscureText
                    decoration={{ labelText: "Password", border: { $: "OutlineInputBorder" } }}
                    onChanged={(text) => setPassword(text)}
                  />
                  <Show when={passwordTooShort()}>
                    <Padding padding={{ $: "only", left: 12, top: 6 }}>
                      <Text style={{ fontSize: 12, color: "red" }}>At least 8 characters</Text>
                    </Padding>
                  </Show>
                </Column>
                {/* A null onPressed gives Material's disabled (dimmed, non-tappable) button. */}
                <ElevatedButton onPressed={canSubmit() ? submit : null}>
                  <Text>Continue</Text>
                </ElevatedButton>
              </Column>
            </ConstrainedBox>
          </Padding>
        </SingleChildScrollView>
      </Center>
    </Scaffold>
  );
}
