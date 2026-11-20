import { Column, Container, For, ListView, Padding, Text } from "solid-fuse";

export interface ChatMessage {
  id: number;
  text: string;
  time: string;
  mine: boolean;
}

export function ChatThread(props: { messages: ChatMessage[] }) {
  return (
    <ListView padding={12}>
      <For each={props.messages}>
        {(message, index) => (
          <Padding padding={{ $: "only", top: index() === 0 ? 0 : 8 }}>
            <Column
              mainAxisSize="min"
              crossAxisAlignment={message.mine ? "end" : "start"}
              spacing={2}
            >
              <Container
                constraints={{ maxWidth: 260 }}
                padding={{ $: "symmetric", horizontal: 12, vertical: 8 }}
                decoration={{
                  $: "BoxDecoration",
                  color: message.mine ? "#2196F3" : "#E5E5EA",
                  borderRadius: {
                    $: "only",
                    topLeft: 16,
                    topRight: 16,
                    bottomLeft: message.mine ? 16 : 4,
                    bottomRight: message.mine ? 4 : 16,
                  },
                }}
              >
                <Text style={{ fontSize: 15, color: message.mine ? "white" : "#212121" }}>
                  {message.text}
                </Text>
              </Container>
              <Text style={{ fontSize: 10, color: "grey" }}>{message.time}</Text>
            </Column>
          </Padding>
        )}
      </For>
    </ListView>
  );
}
