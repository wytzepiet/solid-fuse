import {
  Center,
  Column,
  ConstrainedBox,
  FilledButton,
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

  const tooShort = createMemo(
    () => password().length > 0 && password().length < 8,
  );
  const valid = createMemo(
    () => email().includes("@") && password().length >= 8,
  );

  const submit = () => props.onSubmit(email(), password());

  return (
    <Center>
      <ConstrainedBox constraints={{ maxWidth: 320 }}>
        <Padding padding={16}>
          <Column mainAxisSize="min" crossAxisAlignment="stretch">
            <Text style={{ fontSize: 24 }}>Sign in</Text>
            <SizedBox height={24} />
            <TextField
              keyboardType="emailAddress"
              decoration={{ labelText: "Email" }}
              onChanged={(value: string) => setEmail(value)}
            />
            <SizedBox height={16} />
            <TextField
              obscureText={true}
              decoration={{ labelText: "Password" }}
              onChanged={(value: string) => setPassword(value)}
            />
            <Show when={tooShort()}>
              <Padding padding={{ $: "only", top: 4 }}>
                <Text style={{ color: "red", fontSize: 12 }}>
                  At least 8 characters
                </Text>
              </Padding>
            </Show>
            <SizedBox height={24} />
            {/* An undefined onPressed disables (and dims) a Material button. */}
            <FilledButton onPressed={valid() ? submit : undefined}>
              <Text>Continue</Text>
            </FilledButton>
          </Column>
        </Padding>
      </ConstrainedBox>
    </Center>
  );
}
