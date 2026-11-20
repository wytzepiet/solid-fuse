import { For, ScrollView, Text, View } from "solid-fuse";

export interface ChatMessage {
  id: number;
  text: string;
  time: string;
  mine: boolean;
}

export function ChatThread(props: { messages: ChatMessage[] }) {
  return (
    <ScrollView padding={12} flex={{ direction: "vertical", gap: 8 }}>
      <For each={props.messages}>
        {(message) => (
          <View flex={{ direction: "vertical", gap: 2 }}>
            <View alignment={message.mine ? "topRight" : "topLeft"}>
              <View
                maxWidth={260}
                padding={{ horizontal: 12, vertical: 8 }}
                decoration={{
                  color: message.mine ? "#1E88E5" : "#EEEEEE",
                  borderRadius: {
                    topLeft: 16,
                    topRight: 16,
                    bottomLeft: message.mine ? 16 : 4,
                    bottomRight: message.mine ? 4 : 16,
                  },
                }}
              >
                <Text fontSize={15} color={message.mine ? "white" : "#212121"}>
                  {message.text}
                </Text>
              </View>
            </View>
            <View alignment={message.mine ? "topRight" : "topLeft"}>
              <Text fontSize={10} color="grey">
                {message.time}
              </Text>
            </View>
          </View>
        )}
      </For>
    </ScrollView>
  );
}
