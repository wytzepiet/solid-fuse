import { Column, ConstrainedBox, Container, For, ListView, Padding, Text } from "solid-fuse";

type Message = { id: number; text: string; time: string; mine: boolean };

export function ChatThread(props: { messages: Message[] }) {
  return (
    <ListView padding={12}>
      <For each={props.messages}>
        {(message, index) => (
          <Padding padding={{ $: "only", top: index() === 0 ? 0 : 8 }}>
            <Column
              mainAxisSize="min"
              crossAxisAlignment={message.mine ? "end" : "start"}
            >
              <ConstrainedBox constraints={{ maxWidth: 260 }}>
                <Container
                  padding={{ $: "symmetric", horizontal: 12, vertical: 8 }}
                  decoration={{
                    $: "BoxDecoration",
                    color: message.mine ? "#2196F3" : "#E5E5EA",
                    borderRadius: {
                      $: "only",
                      topLeft: { $: "circular", radius: 16 },
                      topRight: { $: "circular", radius: 16 },
                      bottomLeft: { $: "circular", radius: message.mine ? 16 : 4 },
                      bottomRight: { $: "circular", radius: message.mine ? 4 : 16 },
                    },
                  }}
                >
                  <Text
                    style={{
                      color: message.mine ? "#FFFFFF" : "#1C1C1E",
                      fontSize: 15,
                    }}
                  >
                    {message.text}
                  </Text>
                </Container>
              </ConstrainedBox>
              <Padding padding={{ $: "only", top: 2 }}>
                <Text style={{ color: "#9E9E9E", fontSize: 10 }}>
                  {message.time}
                </Text>
              </Padding>
            </Column>
          </Padding>
        )}
      </For>
    </ListView>
  );
}
