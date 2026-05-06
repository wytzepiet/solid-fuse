import { createSignal } from "solid-js";
import { GestureDetector, Text, View } from "solid-fuse";

export function CounterScreen() {
  const [count, setCount] = createSignal(0);

  return (
    <View flex={{ direction: "vertical", align: "center", gap: 32 }} padding={24}>
      <Text fontSize={96} fontWeight="bold" color="#2563eb">
        {count()}
      </Text>
      <View flex={{ direction: "horizontal", gap: 16, align: "center" }}>
        <GestureDetector onTap={() => setCount((c) => c - 1)}>
          <View
            width={64}
            height={64}
            decoration={{ color: "#ef4444", borderRadius: 32 }}
            flex={{ align: "center", justify: "center" }}
          >
            <Text fontSize={28} fontWeight="bold" color="#fff">
              −
            </Text>
          </View>
        </GestureDetector>
        <GestureDetector onTap={() => setCount(0)}>
          <View
            height={64}
            padding={{ horizontal: 24 }}
            decoration={{ color: "#6b7280", borderRadius: 32 }}
            flex={{ align: "center", justify: "center" }}
          >
            <Text fontSize={15} fontWeight="semiBold" color="#fff">
              Reset
            </Text>
          </View>
        </GestureDetector>
        <GestureDetector onTap={() => setCount((c) => c + 1)}>
          <View
            width={64}
            height={64}
            decoration={{ color: "#22c55e", borderRadius: 32 }}
            flex={{ align: "center", justify: "center" }}
          >
            <Text fontSize={28} fontWeight="bold" color="#fff">
              +
            </Text>
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}
