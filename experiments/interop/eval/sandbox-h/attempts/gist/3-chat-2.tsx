import { For, ScrollView, Text, View } from "solid-fuse";

type Message = { id: number; text: string; time: string; mine: boolean };

export function ChatThread(props: { messages: Message[] }) {
  return (
    <ScrollView>
      <View padding={12} flex={{ direction: "column", gap: 8 }}>
        <For each={props.messages}>
          {(m) => (
            <View flex={{ direction: "column", gap: 2 }}>
              {/* Spacers (grow) push the bubble / timestamp to the sender's side. */}
              <View flex={{ direction: "row" }}>
                {m.mine ? <View grow={1} /> : null}
                <View
                  maxWidth={260}
                  padding={{ horizontal: 12, vertical: 8 }}
                  decoration={{
                    color: m.mine ? "#2563eb" : "#e5e7eb",
                    borderRadius: {
                      topLeft: 16,
                      topRight: 16,
                      bottomLeft: m.mine ? 16 : 4,
                      bottomRight: m.mine ? 4 : 16,
                    },
                  }}
                >
                  <Text fontSize={15} color={m.mine ? "#ffffff" : "#111827"}>
                    {m.text}
                  </Text>
                </View>
                {m.mine ? null : <View grow={1} />}
              </View>
              <View flex={{ direction: "row" }}>
                {m.mine ? <View grow={1} /> : null}
                <Text fontSize={10} color="#9ca3af">
                  {m.time}
                </Text>
                {m.mine ? null : <View grow={1} />}
              </View>
            </View>
          )}
        </For>
      </View>
    </ScrollView>
  );
}
