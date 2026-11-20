import { Column, Container, For, ListView, Padding, SizedBox, Text } from "solid-fuse";

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
            >
              <Container
                constraints={{ maxWidth: 260 }}
                padding={{ $: "symmetric", horizontal: 12, vertical: 8 }}
                decoration={{
                  $: "BoxDecoration",
                  color: message.mine ? "#2196F3" : "#E9E9EB",
                  borderRadius: {
                    $: "only",
                    topLeft: 16,
                    topRight: 16,
                    bottomLeft: message.mine ? 16 : 4,
                    bottomRight: message.mine ? 4 : 16,
                  },
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: message.mine ? "#FFFFFF" : "#222222",
                  }}
                >
                  {message.text}
                </Text>
              </Container>
              <SizedBox height={2} />
              <Text style={{ fontSize: 10, color: "#9E9E9E" }}>
                {message.time}
              </Text>
            </Column>
          </Padding>
        )}
      </For>
    </ListView>
  );
}
