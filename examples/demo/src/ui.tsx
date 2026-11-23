import { Pressable, Text, View } from "solid-fuse";

export function Button(props: { onTap: () => void; children: JSX.Element }) {
  return (
    <Pressable onPress={props.onTap}>
      <View
        padding={{ horizontal: 16, vertical: 12 }}
        decoration={{ color: "#2563eb", borderRadius: 8 }}
      >
        <Text color="white" fontWeight="semiBold">
          {props.children}
        </Text>
      </View>
    </Pressable>
  );
}

export function Row(props: { children: JSX.Element; gap?: number }) {
  return (
    <View layout={{ direction: "horizontal", gap: props.gap ?? 8, align: "center" }}>
      {props.children}
    </View>
  );
}

export function MenuItem(props: { label: string; onTap: () => void }) {
  return (
    <Pressable onPress={props.onTap}>
      <View
        padding={16}
        decoration={{ border: { bottom: { width: 1, color: "#E5E7EB" } } }}
      >
        <Text fontSize={16}>{props.label}</Text>
      </View>
    </Pressable>
  );
}
