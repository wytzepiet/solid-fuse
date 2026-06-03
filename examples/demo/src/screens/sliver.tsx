import { createSignal } from "solid-js";
import {
  CupertinoSliverRefreshControl,
  CustomScrollView,
  FlexibleSpaceBar,
  For,
  GestureDetector,
  Icon,
  SliverAppBar,
  SliverGrid,
  SliverList,
  SliverPadding,
  SliverPersistentHeader,
  SliverToBoxAdapter,
  Text,
  View,
  useNavigation,
} from "solid-fuse";
import { add, refresh, close } from "solid-fuse/icons/material";
import { Button, Row } from "../ui";

interface Item {
  id: number;
  label: string;
  tint: string;
}

const TINTS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"];

let nextId = 6;
function makeItem(): Item {
  const id = nextId++;
  return { id, label: `Item ${id}`, tint: TINTS[id % TINTS.length] };
}

export function SliverScreen() {
  const nav = useNavigation();

  const [items, setItems] = createSignal<Item[]>(
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      label: `Item ${i}`,
      tint: TINTS[i % TINTS.length],
    })),
  );

  const addItem = () => setItems((prev) => [...prev, makeItem()]);
  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((it) => it.id !== id));
  const bumpItem = (id: number) =>
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, label: `${it.label} ✦` } : it,
      ),
    );

  // Pull-to-refresh mutates the signal: resets the list to a fresh batch.
  const onRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    nextId = 6;
    setItems(
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        label: `Item ${i}`,
        tint: TINTS[i % TINTS.length],
      })),
    );
  };

  return (
    <CustomScrollView physics="bouncing">
      {/* Collapsing app bar with a flexible space + gradient background. */}
      <SliverAppBar
        pinned
        expandedHeight={220}
        backgroundColor="#0f172a"
        foregroundColor="white"
        leading={
          <GestureDetector onTap={() => nav.pop()}>
            <View padding={12} flex={{ align: "center", justify: "center" }}>
              <Icon data={close} size={22} color="white" />
            </View>
          </GestureDetector>
        }
        actions={[
          <GestureDetector onTap={addItem}>
            <View padding={12} flex={{ align: "center", justify: "center" }}>
              <Icon data={add} size={22} color="white" />
            </View>
          </GestureDetector>,
        ]}
        flexibleSpace={
          <FlexibleSpaceBar
            title={
              <Text fontSize={18} fontWeight="bold" color="white">
                slivers
              </Text>
            }
            background={
              <View
                decoration={{
                  gradient: {
                    type: "linear",
                    begin: "topLeft",
                    end: "bottomRight",
                    colors: ["#1e3a8a", "#7c3aed", "#0f172a"],
                  },
                }}
                flex={{ direction: "vertical", justify: "end" }}
                padding={{ horizontal: 20, bottom: 56 }}
              >
                <Text color="#c7d2fe" fontSize={13}>
                  CustomScrollView · pull to refresh · reactive lists
                </Text>
              </View>
            }
          />
        }
      />

      {/* iOS-style pull-to-refresh. Drag down to mutate the signal. */}
      <CupertinoSliverRefreshControl onRefresh={onRefresh} />

      {/* Controls — adds/removes/updates list items. */}
      <SliverToBoxAdapter>
        <View
          padding={16}
          flex={{ direction: "vertical", gap: 8 }}
          decoration={{ border: { bottom: { width: 1, color: "#E5E7EB" } } }}
        >
          <Text fontWeight="semiBold">
            {items().length} item{items().length === 1 ? "" : "s"}
          </Text>
          <Row>
            <Button onTap={addItem}>add</Button>
            <Button onTap={() => setItems((p) => p.slice(0, -1))}>
              remove last
            </Button>
            <Button onTap={() => setItems([])}>clear</Button>
          </Row>
        </View>
      </SliverToBoxAdapter>

      {/* Sticky section header — stays pinned while its list scrolls past. */}
      <SliverPersistentHeader pinned minExtent={44} maxExtent={44}>
        {(shrinkOffset) => (
          <View
            height={44}
            padding={{ horizontal: 16 }}
            alignment="centerLeft"
            decoration={{
              color: "#111827",
              shadow:
                shrinkOffset > 0
                  ? { color: "#00000033", blurRadius: 6, offsetY: 2 }
                  : undefined,
            }}
          >
            <Text color="white" fontWeight="semiBold" fontSize={13}>
              SliverList — reactive rows
            </Text>
          </View>
        )}
      </SliverPersistentHeader>

      {/* Reactive list. Tap a row to bump it; tap × to remove it. */}
      <SliverList>
        <For each={items()}>
          {(item) => (
            <GestureDetector onTap={() => bumpItem(item.id)}>
              <View
                padding={16}
                flex={{ direction: "horizontal", align: "center", gap: 12 }}
                decoration={{
                  border: { bottom: { width: 1, color: "#F3F4F6" } },
                }}
              >
                <View
                  width={36}
                  height={36}
                  decoration={{ color: item.tint, borderRadius: 18 }}
                  flex={{ align: "center", justify: "center" }}
                >
                  <Text color="white" fontWeight="bold" fontSize={13}>
                    {item.id}
                  </Text>
                </View>
                <View grow={1}>
                  <Text fontSize={15}>{item.label}</Text>
                </View>
                <GestureDetector onTap={() => removeItem(item.id)}>
                  <View padding={8}>
                    <Icon data={close} size={18} color="#9CA3AF" />
                  </View>
                </GestureDetector>
              </View>
            </GestureDetector>
          )}
        </For>
      </SliverList>

      {/* Sticky header for the grid section. */}
      <SliverPersistentHeader pinned minExtent={44} maxExtent={44}>
        {() => (
          <View
            height={44}
            padding={{ horizontal: 16 }}
            alignment="centerLeft"
            decoration={{ color: "#111827" }}
          >
            <Text color="white" fontWeight="semiBold" fontSize={13}>
              SliverGrid — same data, gridded
            </Text>
          </View>
        )}
      </SliverPersistentHeader>

      {/* Reactive grid driven by the same signal. */}
      <SliverPadding padding={16}>
        <SliverGrid
          crossAxisCount={3}
          mainAxisSpacing={12}
          crossAxisSpacing={12}
          childAspectRatio={1}
        >
          <For each={items()}>
            {(item) => (
              <View
                decoration={{ color: item.tint, borderRadius: 12 }}
                flex={{ direction: "vertical", align: "center", justify: "center", gap: 4 }}
              >
                <Text color="white" fontWeight="bold" fontSize={22}>
                  {item.id}
                </Text>
                <Text color="#ffffffcc" fontSize={11}>
                  {item.label}
                </Text>
              </View>
            )}
          </For>
        </SliverGrid>
      </SliverPadding>

      {/* Footer. */}
      <SliverToBoxAdapter>
        <View padding={24} flex={{ direction: "vertical", align: "center", gap: 8 }}>
          <Icon data={refresh} size={20} color="#9CA3AF" />
          <Text color="#9CA3AF" fontSize={13} textAlign="center">
            Pull down from the top to refresh the list.
          </Text>
        </View>
      </SliverToBoxAdapter>
    </CustomScrollView>
  );
}
