import { createSignal } from "solid-js";
import {
  Icon,
  MaterialPage,
  ScrollView,
  Text,
  View,
  useNavigator,
} from "solid-fuse";
import * as md from "solid-fuse/icons/material";
import { Button, Row } from "../ui";

export function IconScreen() {
  const nav = useNavigator();
  const [size, setSize] = createSignal(32);
  const [color, setColor] = createSignal("#111827");

  return (
    <MaterialPage>
      <ScrollView flex={{ direction: "vertical", gap: 16 }}>
        <View padding={{ horizontal: 16, top: 16, bottom: 8 }}>
          <Text fontSize={24} fontWeight="bold">
            icon
          </Text>
          <Text color="#6B7280" fontSize={14}>
            Baseline icon rendering + reactive props
          </Text>
        </View>

        <View padding={{ horizontal: 16 }} flex={{ direction: "vertical", gap: 24 }}>
          {/* Static grid — if any of these don't render, the primitive is broken */}
          <View flex={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight="semiBold">Static grid</Text>
            <View flex={{ direction: "horizontal", gap: 16, align: "center" }}>
              <Icon data={md.search} size={32} />
              <Icon data={md.lock} size={32} />
              <Icon data={md.home} size={32} />
              <Icon data={md.settings} size={32} />
              <Icon data={md.favorite} size={32} color="#EF4444" />
              <Icon data={md.star} size={32} color="#F59E0B" />
            </View>
          </View>

          {/* Reactive size + color */}
          <View flex={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight="semiBold">Reactive props</Text>
            <View
              flex={{ direction: "horizontal", gap: 12, align: "center" }}
              padding={12}
            >
              <Icon data={md.favorite} size={size()} color={color()} />
              <Text color="#6B7280" fontSize={13}>
                size = {size()}, color = {color()}
              </Text>
            </View>
            <Row>
              <Button onTap={() => setSize(16)}>16</Button>
              <Button onTap={() => setSize(32)}>32</Button>
              <Button onTap={() => setSize(64)}>64</Button>
            </Row>
            <Row>
              <Button onTap={() => setColor("#EF4444")}>red</Button>
              <Button onTap={() => setColor("#10B981")}>green</Button>
              <Button onTap={() => setColor("#3B82F6")}>blue</Button>
            </Row>
          </View>

          {/* Icon inside a view — exercises the "orphan has its own children" path
              from the other direction: normal composition, should just work */}
          <View flex={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight="semiBold">Icon + text row</Text>
            <View
              flex={{ direction: "horizontal", gap: 8, align: "center" }}
              padding={12}
            >
              <Icon data={md.info} size={20} color="#3B82F6" />
              <Text>Inline icon + text composition</Text>
            </View>
          </View>
        </View>

        <View padding={16}>
          <Button onTap={() => nav.pop()}>Back</Button>
        </View>
      </ScrollView>
    </MaterialPage>
  );
}
