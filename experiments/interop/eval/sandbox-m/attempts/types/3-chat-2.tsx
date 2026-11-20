import { Column, Container, ListView, Padding, Text } from "solid-fuse";

export interface ChatMessage {
  id: number;
  text: string;
  time: string;
  mine: boolean;
}

export function ChatThread(props: { messages: ChatMessage[] }) {
  return (
    <ListView padding={12}>
      {props.messages.map((m, i) => (
        <Padding padding={{ $: "only", top: i === 0 ? 0 : 8 }}>
          <Column crossAxisAlignment={m.mine ? "end" : "start"} mainAxisSize="min">
            <Container
              constraints={{ maxWidth: 260 }}
              padding={{ $: "symmetric", horizontal: 12, vertical: 8 }}
              decoration={{
                $: "BoxDecoration",
                color: m.mine ? "#2196F3" : "#E5E5EA",
                borderRadius: {
                  $: "only",
                  topLeft: 16,
                  topRight: 16,
                  bottomLeft: m.mine ? 16 : 4,
                  bottomRight: m.mine ? 4 : 16,
                },
              }}
            >
              <Text style={{ fontSize: 15, color: m.mine ? "white" : "#222222" }}>{m.text}</Text>
            </Container>
            <Padding padding={{ $: "only", top: 2 }}>
              <Text style={{ fontSize: 10, color: "grey" }}>{m.time}</Text>
            </Padding>
          </Column>
        </Padding>
      ))}
    </ListView>
  );
}
