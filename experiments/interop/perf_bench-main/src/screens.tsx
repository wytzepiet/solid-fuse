// Realistic screens and list operations (unchanged from the report 11 benchmark).
import { View, Text, ScrollView, For } from "solid-fuse";
import { createSignal } from "solid-js";

const COLORS = ["#3366ff", "#2e9e5b", "#e08a00", "#d64545", "#7a4fd6", "#0aa5a5", "#c2478f", "#5b6b7a"];

/** One card = 11 nodes: 3 views, 4 text elements, 4 text leaves. */
export function Card(p: { i: number }) {
  return (
    <View
      padding={{ horizontal: 16, vertical: 10 }}
      margin={{ bottom: 8 }}
      decoration={{ color: "#ffffff", borderRadius: 12, border: { width: 1, color: "#e2e2e2" } }}
      flex={{ direction: "horizontal", gap: 12, align: "center" }}
    >
      <View width={40} height={40} alignment="center" decoration={{ color: COLORS[p.i % 8], shape: "circle" }}>
        <Text color="white" fontWeight="bold">{String.fromCharCode(65 + (p.i % 26))}</Text>
      </View>
      <View flex={{ gap: 2 }}>
        <Text fontSize={16} fontWeight="semiBold">{`Item title ${p.i}`}</Text>
        <Text fontSize={13} color="#666666" maxLines={1} overflow="ellipsis">{`Subtitle for row ${p.i}, with some detail`}</Text>
      </View>
      <Text fontSize={12} color="#999999">{`${p.i % 60}m`}</Text>
    </View>
  );
}

export const NODES_PER_CARD = 11;
export const cardsFor = (nodes: number) => Math.max(1, Math.round((nodes - 2) / NODES_PER_CARD));

export function MountScreen(p: { cards: number }) {
  const items = Array.from({ length: p.cards }, (_, i) => i);
  return (
    <ScrollView>
      <View padding={16}>
        <For each={items}>{(i) => <Card i={i} />}</For>
      </View>
    </ScrollView>
  );
}

// --- one signal, k dependants -------------------------------------------------

export const [t1, setT1] = createSignal(0);
export const [t50, setT50] = createSignal(0);
export const [t1000, setT1000] = createSignal(0);
export const [c1, setC1] = createSignal(0);
export const [c50, setC50] = createSignal(0);
export const [c1000, setC1000] = createSignal(0);
const BG = ["#ffffff", "#e8f0ff"];

/** 1,000 rows (3 nodes each). Row i's text reads t1000, plus t50 if i<50, plus t1 if i==0; same for colour. */
export function UpdateScreen() {
  const rows = Array.from({ length: 1000 }, (_, i) => i);
  return (
    <ScrollView>
      <View padding={8}>
        <For each={rows}>
          {(i) => (
            <View
              padding={{ horizontal: 8, vertical: 2 }}
              decoration={{ color: BG[(c1000() + (i < 50 ? c50() : 0) + (i === 0 ? c1() : 0)) % 2] }}
            >
              <Text fontSize={12}>{`Row ${i}: ${t1000()}${i < 50 ? "/" + t50() : ""}${i === 0 ? "/" + t1() : ""}`}</Text>
            </View>
          )}
        </For>
      </View>
    </ScrollView>
  );
}

// --- lists ----------------------------------------------------------------------

export interface Row { id: number; name: string; value: number }
let nextRowId = 1;
// xorshift so runs are repeatable
let seed = 0x2545f491;
export function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
export const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, () => {
    const id = nextRowId++;
    return { id, name: `Row ${id}`, value: Math.floor(rnd() * 100000) };
  });

export const [rows, setRows] = createSignal<Row[]>([]);

/** One row = 5 nodes: 1 view, 2 text elements, 2 text leaves. Keyed by identity (Solid's default). */
export function ListScreen() {
  return (
    <ScrollView>
      <View padding={8}>
        <For each={rows()}>
          {(r) => (
            <View padding={{ horizontal: 8, vertical: 4 }} flex={{ direction: "horizontal", gap: 8 }}>
              <Text fontSize={13}>{r.name}</Text>
              <Text fontSize={13} color="#777777">{`${r.value}`}</Text>
            </View>
          )}
        </For>
      </View>
    </ScrollView>
  );
}
