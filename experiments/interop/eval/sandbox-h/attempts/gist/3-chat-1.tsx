import { For, ScrollView, Text, View } from "solid-fuse";

type Message = { id: number; text: string; time: string; mine: boolean };

export function ChatThread(props: { messages: Message[] }) {
  return (
    <ScrollView>
      <View padding={12} flex={{ direction: "column", gap: 8 }}>
        <For each={props.messages}>
          {(message) => (
            <View
              flex={{
                direction: "row",
                justify: message.mine ? "end" : "start",
              }}
            >
              <View
                flex={{
                  direction: "column",
                  gap: 2,
                  align: message.mine ? "end" : "start",
                }}
              >
                <View
                  maxWidth={260}
                  padding={{ horizontal: 12, vertical: 8 }}
                  decoration={{
                    color: message.mine ? "#2563eb" : "#e5e7eb",
                    borderRadius: {
                      topLeft: 16,
                      topRight: 16,
                      bottomLeft: message.mine ? 16 : 4,
                      bottomRight: message.mine ? 4 : 16,
                    },
                  }}
                >
                  <Text
                    fontSize={15}
                    color={message.mine ? "#ffffff" : "#111827"}
                  >
                    {message.text}
                  </Text>
                </View>
                <Text fontSize={10} color="#9ca3af">
                  {message.time}
                </Text>
              </View>
            </View>
          )}
        </For>
      </View>
    </ScrollView>
  );
}
