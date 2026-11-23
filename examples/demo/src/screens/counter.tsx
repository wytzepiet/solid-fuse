import { createSignal } from "solid-js";
import { Pressable, Text, View } from "solid-fuse";

export function CounterScreen() {
  const [count, setCount] = createSignal(0);

  return (
    <View layout={{ direction: "vertical", align: "center", gap: 32 }} padding={24}>
      <Text fontSize={96} fontWeight={700} color="#2563eb">
        {count()}
      </Text>
      <View layout={{ direction: "horizontal", gap: 16, align: "center" }}>
        <Pressable onPress={() => setCount((c) => c - 1)}>
          <View
            width={64}
            height={64}
            decoration={{ color: "#ef4444", borderRadius: 32 }}
            layout={{ align: "center", justify: "center" }}
          >
            <Text fontSize={28} fontWeight={700} color="#fff">
              −
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setCount(0)}>
          <View
            height={64}
            padding={{ horizontal: 24 }}
            decoration={{ color: "#6b7280", borderRadius: 32 }}
            layout={{ align: "center", justify: "center" }}
          >
            <Text fontSize={15} fontWeight={600} color="#fff">
              Reset
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setCount((c) => c + 1)}>
          <View
            width={64}
            height={64}
            decoration={{ color: "#22c55e", borderRadius: 32 }}
            layout={{ align: "center", justify: "center" }}
          >
            <Text fontSize={28} fontWeight={700} color="#fff">
              +
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
