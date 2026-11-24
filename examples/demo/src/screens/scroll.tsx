import { ScrollView, Text, View, useNav } from "solid-fuse";
import { createScrollController } from "#fuse/flutter";
import { easeInOut } from "#fuse/flutter/Curves";
import { Button } from "../ui";

export function ScrollScreen() {
  const nav = useNav();

  // initialScrollOffset tests that plain props flow inline through the create
  // op so the Dart-side handle factory sees them before constructing the
  // ScrollController.
  const scroll = createScrollController({ initialScrollOffset: 120 });

  return (
    <ScrollView
      controller={scroll}
      layout={{ direction: "vertical", gap: 12 }}
    >
        <View
          padding={{ horizontal: 16, top: 16, bottom: 8 }}
          layout={{ direction: "vertical", gap: 4 }}
        >
          <Text fontSize={24} fontWeight={700}>
            scrollController
          </Text>
          <Text color="#6B7280" fontSize={14}>
            initialScrollOffset, reactive offset, imperative scroll
          </Text>
        </View>

        {/* Live offset signal — proves Dart → JS setter round-trip */}
        <View
          padding={{ horizontal: 16 }}
          layout={{ direction: "vertical", gap: 8 }}
        >
          <Text fontWeight={600}>
            offset = {(scroll.offset() ?? 0).toFixed(1)}
          </Text>
          <ScrollView
            scrollDirection="horizontal"
            layout={{ direction: "horizontal", gap: 8, align: "center" }}
          >
            <Button onTap={() => scroll.jumpTo(0)}>jumpTo(0)</Button>
            <Button onTap={() => scroll.animateTo(1200, { duration: 800, curve: easeInOut })}>
              animateTo(1200)
            </Button>
          </ScrollView>
        </View>

        {/* Content to scroll through */}
        <View
          padding={16}
          layout={{ direction: "vertical", gap: 8 }}
        >
          {Array.from({ length: 40 }, (_, i) => (
            <View
              padding={16}
              decoration={{
                color: i % 2 === 0 ? "#F3F4F6" : "#E5E7EB",
                borderRadius: 8,
              }}
            >
              <Text>row {i}</Text>
            </View>
          ))}
        </View>

        <View padding={16}>
          <Button onTap={() => nav.pop()}>Back</Button>
        </View>
    </ScrollView>
  );
}
