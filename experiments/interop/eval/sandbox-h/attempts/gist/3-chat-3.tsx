import { For, ScrollView, Text, View } from "solid-fuse";

type Message = { id: number; text: string; time: string; mine: boolean };

export function ChatThread(props: { messages: Message[] }) {
  return (
    <ScrollView>
      <View padding={12} flex={{ direction: "column", gap: 8, align: "stretch" }}>
        <For each={props.messages}>
          {(message) => (
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
                  color: message.mine ? "#2563EB" : "#E5E7EB",
                  borderRadius: {
                    topLeft: 16,
                    topRight: 16,
                    bottomLeft: message.mine ? 16 : 4,
                    bottomRight: message.mine ? 4 : 16,
                  },
                }}
              >
                <Text fontSize={15} color={message.mine ? "#FFFFFF" : "#111827"}>
                  {message.text}
                </Text>
              </View>
              <Text fontSize={10} color="#9CA3AF">
                {message.time}
              </Text>
            </View>
          )}
        </For>
      </View>
    </ScrollView>
  );
}
