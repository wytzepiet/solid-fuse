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

  const passwordTooShort = createMemo(
    () => password().length > 0 && password().length < 8,
  );
  const valid = createMemo(
    () => email().includes("@") && password().length >= 8,
  );

  const submit = () => {
    props.onSubmit(email(), password());
  };

  return (
    <Center>
      <ConstrainedBox constraints={{ maxWidth: 320 }}>
        <Column mainAxisSize="min" crossAxisAlignment="stretch">
          <Text style={{ fontSize: 24, fontWeight: "bold" }}>Sign in</Text>
          <SizedBox height={24} />
          <TextField
            keyboardType="emailAddress"
            autocorrect={false}
            decoration={{ labelText: "Email" }}
            onChanged={(value: string) => {
              setEmail(value);
            }}
          />
          <SizedBox height={16} />
          <TextField
            obscureText={true}
            autocorrect={false}
            decoration={{ labelText: "Password" }}
            onChanged={(value: string) => {
              setPassword(value);
            }}
          />
          <Show when={passwordTooShort()}>
            <Padding padding={{ $: "only", top: 4 }}>
              <Text style={{ color: "red", fontSize: 12 }}>
                At least 8 characters
              </Text>
            </Padding>
          </Show>
          <SizedBox height={24} />
          {/* A FilledButton without onPressed is disabled: Material dims it and ignores taps. */}
          <FilledButton onPressed={valid() ? submit : undefined}>
            <Text>Continue</Text>
          </FilledButton>
        </Column>
      </ConstrainedBox>
    </Center>
  );
}
