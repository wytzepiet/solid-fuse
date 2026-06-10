import { createSignal } from "solid-js";
import { Color, GestureDetector, Text, View } from "solid-fuse";

export function CounterScreen() {
  const [count, setCount] = createSignal(0);

  return (
    <View flex={{ direction: "vertical", align: "center", gap: 32 }} padding={24}>
      <Text fontSize={96} fontWeight="bold" color={Color.hex("#2563eb")}>
        {count()}
      </Text>
      <View flex={{ direction: "horizontal", gap: 16, align: "center" }}>
        <GestureDetector onTap={() => setCount((c) => c - 1)}>
          <View
            width={64}
            height={64}
            decoration={{ color: Color.hex("#ef4444"), borderRadius: 32 }}
            flex={{ align: "center", justify: "center" }}
          >
            <Text fontSize={28} fontWeight="bold" color={Color.hex("#fff")}>
              −
            </Text>
          </View>
        </GestureDetector>
        <GestureDetector onTap={() => setCount(0)}>
          <View
            height={64}
            padding={{ horizontal: 24 }}
            decoration={{ color: Color.hex("#6b7280"), borderRadius: 32 }}
            flex={{ align: "center", justify: "center" }}
          >
            <Text fontSize={15} fontWeight="semiBold" color={Color.hex("#fff")}>
              Reset
            </Text>
          </View>
        </GestureDetector>
        <GestureDetector onTap={() => setCount((c) => c + 1)}>
          <View
            width={64}
            height={64}
            decoration={{ color: Color.hex("#22c55e"), borderRadius: 32 }}
            flex={{ align: "center", justify: "center" }}
          >
            <Text fontSize={28} fontWeight="bold" color={Color.hex("#fff")}>
              +
            </Text>
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}
