import type { JSX } from "solid-js";

export function Button(props: { onTap: () => void; children: JSX.Element }) {
  return (
    <gestureDetector onTap={props.onTap}>
      <view
        padding={{ horizontal: 16, vertical: 12 }}
        decoration={{ color: "#2563eb", borderRadius: 8 }}
      >
        <text color="white" fontWeight="semiBold">
          {props.children}
        </text>
      </view>
    </gestureDetector>
  );
}

export function Row(props: { children: JSX.Element; gap?: number }) {
  return (
    <view flex={{ direction: "horizontal", gap: props.gap ?? 8, align: "center" }}>
      {props.children}
    </view>
  );
}

export function MenuItem(props: { label: string; onTap: () => void }) {
  return (
    <gestureDetector onTap={props.onTap}>
      <view
        padding={16}
        decoration={{ border: { bottom: { width: 1, color: "#E5E7EB" } } }}
      >
        <text fontSize={16}>{props.label}</text>
      </view>
    </gestureDetector>
  );
}
