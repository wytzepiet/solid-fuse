import { createSignal } from "solid-js";
import { GestureDetector, Text, View } from "solid-fuse";
import { ListViewBuilder } from "#fuse/flutter";

// A generated ListView.builder: Flutter asks JS for each row as it scrolls
// into view (a synchronous call), and drops the rows that leave.
export function BuilderScreen() {
  const [picked, setPicked] = createSignal(-1);

  return (
    <View flex={{ direction: "vertical", align: "stretch" }}>
      <View padding={{ horizontal: 16, top: 16, bottom: 8 }}>
        <Text fontSize={24} fontWeight="bold">
          builder
        </Text>
        <Text color="#6B7280" fontSize={14}>
          {picked() < 0 ? "10,000 rows, built as they scroll in" : `Picked row ${picked()}`}
        </Text>
      </View>
      <View grow={1}>
        <ListViewBuilder
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
