import { createSignal } from "solid-js";
import {
  Icon,
  ScrollView,
  Text,
  View,
  useNav,
} from "solid-fuse";
import { Icons as md } from "@solid-fuse/material";
import { LucideIcons } from "@solid-fuse/lucide";
import { Button, Row } from "../ui";

export function IconScreen() {
  const nav = useNav();
  const [size, setSize] = createSignal(32);
  const [color, setColor] = createSignal<`#${string}`>("#111827");

  return (
    <ScrollView layout={{ direction: "vertical", gap: 16 }}>
        <View padding={{ horizontal: 16, top: 16, bottom: 8 }}>
          <Text fontSize={24} fontWeight={700}>
            icon
          </Text>
          <Text color="#6B7280" fontSize={14}>
            Baseline icon rendering + reactive props
          </Text>
        </View>

        <View padding={{ horizontal: 16 }} layout={{ direction: "vertical", gap: 24 }}>
          {/* Static grid — if any of these don't render, the primitive is broken */}
          <View layout={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight={600}>Static grid</Text>
            <View layout={{ direction: "horizontal", gap: 16, align: "center" }}>
              <Icon icon={md.search} size={32} />
              <Icon icon={md.lock} size={32} />
              <Icon icon={md.home} size={32} />
              <Icon icon={md.settings} size={32} />
              <Icon icon={md.favorite} size={32} color="#EF4444" />
              <Icon icon={md.star} size={32} color="#F59E0B" />
            </View>
          </View>

          <View layout={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight={600}>Lucide</Text>
            <View layout={{ direction: "horizontal", gap: 16, align: "center" }}>
              <Icon testId="lucide-heart" icon={LucideIcons.heart} size={32} color="#EF4444" />
              <Icon icon={LucideIcons.rocket} size={32} />
              <Icon icon={LucideIcons.git_branch} size={32} />
            </View>
          </View>

          {/* Reactive size + color */}
          <View layout={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight={600}>Reactive props</Text>
            <View
              layout={{ direction: "horizontal", gap: 12, align: "center" }}
              padding={12}
            >
              <Icon icon={md.favorite} size={size()} color={color()} />
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
          <View layout={{ direction: "vertical", gap: 6 }}>
            <Text fontWeight={600}>Icon + text row</Text>
            <View
              layout={{ direction: "horizontal", gap: 8, align: "center" }}
              padding={12}
            >
              <Icon icon={md.info} size={20} color="#3B82F6" />
              <Text>Inline icon + text composition</Text>
            </View>
          </View>
        </View>

        <View padding={16}>
          <Button onTap={() => nav.pop()}>Back</Button>
        </View>
    </ScrollView>
  );
}
