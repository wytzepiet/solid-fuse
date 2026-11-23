import { createSignal } from "solid-js";
import { GestureDetector, Text, View } from "solid-fuse";
import { ListViewBuilder, createScrollController } from "#fuse/flutter";

// A generated ListView.builder: Flutter asks JS for each row as it scrolls
// into view (a synchronous call), and drops the rows that leave. The
// controller's `position` is a handle Dart makes and hands to JS.
export function BuilderScreen() {
  const [picked, setPicked] = createSignal(-1);
  const scroll = createScrollController();
  const at = () => Math.round(scroll.position()?.pixels() ?? 0);

  return (
    <View layout={{ direction: "vertical", align: "stretch" }}>
      <View padding={{ horizontal: 16, top: 16, bottom: 8 }}>
        <Text fontSize={24} fontWeight="bold">
          builder
        </Text>
        <Text color="#6B7280" fontSize={14}>
          {picked() < 0 ? "10,000 rows, built as they scroll in" : `Picked row ${picked()}`}
        </Text>
        <Text color="#6B7280" fontSize={14}>{`Scrolled ${at()} px`}</Text>
      </View>
      <View flex={1}>
        <ListViewBuilder
          controller={scroll}
          itemCount={10000}
          itemExtent={48}
          itemBuilder={(index) => (
            <GestureDetector onTap={() => setPicked(index)}>
              <View padding={{ horizontal: 16, vertical: 12 }} decoration={{ color: picked() === index ? "#DBEAFE" : "#FFFFFF" }}>
                <Text>{`Row ${index}`}</Text>
              </View>
            </GestureDetector>
          )}
        />
      </View>
    </View>
  );
}
