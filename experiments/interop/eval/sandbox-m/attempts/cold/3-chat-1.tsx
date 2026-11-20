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
        {(msg, index) => (
          <Padding padding={{ $: "only", top: index() === 0 ? 0 : 8 }}>
            <Column
              mainAxisSize="min"
              crossAxisAlignment={msg.mine ? "end" : "start"}
            >
              <Container
                constraints={{ maxWidth: 260 }}
                padding={{ $: "symmetric", horizontal: 12, vertical: 8 }}
                decoration={{
                  $: "BoxDecoration",
                  color: msg.mine ? "#2979FF" : "#E9E9EB",
                  borderRadius: {
                    $: "only",
                    topLeft: 16,
                    topRight: 16,
                    bottomLeft: msg.mine ? 16 : 4,
                    bottomRight: msg.mine ? 4 : 16,
                  },
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: msg.mine ? "#FFFFFF" : "#1C1C1E",
                  }}
                >
                  {msg.text}
                </Text>
              </Container>
              <SizedBox height={2} />
              <Text style={{ fontSize: 10, color: "#8E8E93" }}>{msg.time}</Text>
            </Column>
          </Padding>
        )}
      </For>
    </ListView>
  );
}
