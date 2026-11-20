import { createMemo, createSignal } from "solid-js";
import {
  Center,
  Column,
  ConstrainedBox,
  ElevatedButton,
  Padding,
  SizedBox,
  Text,
  TextField,
} from "solid-fuse";

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

  return (
    <Center>
      <ConstrainedBox constraints={{ maxWidth: 320 }}>
        <Padding padding={16}>
          <Column mainAxisSize="min" crossAxisAlignment="stretch">
            <Text style={{ fontSize: 28, fontWeight: "bold" }}>Sign in</Text>
            <SizedBox height={24} />
            <TextField
              keyboardType="emailAddress"
              autocorrect={false}
              decoration={{
                labelText: "Email",
                border: { $: "OutlineInputBorder" },
              }}
              onChanged={(value) => setEmail(value)}
            />
            <SizedBox height={16} />
            <TextField
              obscureText
              decoration={{
                labelText: "Password",
                border: { $: "OutlineInputBorder" },
              }}
              onChanged={(value) => setPassword(value)}
            />
            {passwordTooShort() ? (
              <Padding padding={{ $: "only", top: 6, left: 12 }}>
                <Text style={{ color: "red", fontSize: 12 }}>
                  At least 8 characters
                </Text>
              </Padding>
            ) : null}
            <SizedBox height={24} />
            {/* A null onPressed gives Material's dimmed, non-tappable disabled state. */}
            <ElevatedButton
              onPressed={
                canSubmit()
                  ? () => props.onSubmit(email(), password())
                  : null
              }
            >
              <Text>Continue</Text>
            </ElevatedButton>
          </Column>
        </Padding>
      </ConstrainedBox>
    </Center>
  );
}
